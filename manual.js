const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/lib/sync");


// const WORKSPACE = process.env.GITHUB_WORKSPACE;
const WORKSPACE = "COVID-19-BASE"
const DATA_REPO = "data"; // from main.yml checkout action path
const MAIN_REPO = "main"; // from main.yml checkout action path
const FILENAME_CONFIRMED = "time_series_19-covid-Confirmed.csv";
const FILENAME_DEATHS = "time_series_19-covid-Deaths.csv";
const FILENAME_RECOVERED = "time_series_19-covid-Recovered.csv";

const dataPath = path.join(
  WORKSPACE,
  //DATA_REPO,
  "csse_covid_19_data",
  "csse_covid_19_time_series"
);
const countryOutputPath = path.join( "docs", "country-timeseries.json");
const provinceOutputPath = path.join("docs", "can-provinces.json");

function extract(filename) {
  const csv = fs.readFileSync(path.resolve(dataPath, filename));
  const [headers, ...rows] = parse(csv);
  const [province, country, lat, long, ...dates] = headers;
  const countryCounts = {};
  const provinceCounts = {};
  const thisCountry = 'Canada'
  rows.forEach(([province, country, lat, long, ...counts]) => {
        // if country hasn't been added to countryCounts, add empty obj
    //console.log(country, countryCounts[country])
    countryCounts[country] = countryCounts[country] || {mainData: {} };
    // if profince is truthy, add now
    if (province) {
      countryCounts[country].Provinces = countryCounts[country]["Provinces"] || {}
      //console.log(country)
      countryCounts[country]["Provinces"][province] = {}
    }      
    dates.forEach((date, i) => {
      countryCounts[country].mainData[date] = countryCounts[country].mainData[date] || 0;
      countryCounts[country].mainData[date] += +counts[i];
      if (province) {
        countryCounts[country]["Provinces"][province][date] = counts[i];
      }
    });
  });
  return [countryCounts, dates];
}

function buildSeries (dates, confirmed, deaths, recovered) {
  //console.log(confirmed['3/16/20'])
  //console.log(dates)
  return dates.map(date => {
    const [month, day] = date.split("/");
    
    return {
      date: `2020-${month}-${day}`,
      confirmed: confirmed[date],
      deaths: deaths[date],
      recovered: recovered[date]
    };
  });
}

const [confirmed, dates] = extract(FILENAME_CONFIRMED);
const [deaths] = extract(FILENAME_DEATHS);
const [recovered] = extract(FILENAME_RECOVERED);
let countries = Object.keys(confirmed);
//console.log( confirmed)
countries = (countries.indexOf('Provinces') !== -1 ) ? countries.slice('Provinces', -1) : countries;
const mainResults = {};
const provSeries = {};
countries.forEach(country => {
  let c = confirmed[country].mainData,
      d = deaths[country].mainData,
      r = recovered[country].mainData;
  //console.log(c);
  //mainResults[country] = buildSeries(dates, c, d, r);
  if (confirmed[country].Provinces) {
    provSeries[country] = {}
    let provinces = Object.keys(confirmed[country].Provinces)
    for (p of provinces) {
      let dp = deaths[country].Provinces[p]
      let cp = confirmed[country].Provinces[p]
      let rp = recovered[country].Provinces[p]
      provSeries[country][p] = buildSeries(dates, cp, dp, rp);
    }
    console.log(provSeries[country])
  }
  
  // results[country] = dates.map(date => {
  //   const [month, day] = date.split("/");
  //   return {
  //     date: `2020-${month}-${day}`,
  //     confirmed: confirmedCountries[country][date],
  //     deaths: deathsCountries[country][date],
  //     recovered: recovered[country][date]
  //   };
  // });
});

fs.writeFileSync(countryOutputPath, JSON.stringify(mainResults, null, 2));

let byProvince = Object.keys(provSeries);
byProvince.forEach (ctry => {
  let thisPath = path.join("docs", `provinces-${ctry}.json`);
  fs.writeFileSync(thisPath, JSON.stringify(provSeries[ctry], null, 2))
})
