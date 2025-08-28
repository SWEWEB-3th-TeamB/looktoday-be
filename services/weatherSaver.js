// Weather 모델을 늦게(require 시점) 바인딩해서 undefined/upsert 에러 방지

function round1(n) {
    if (n == null) return null;
    return Math.round(Number(n) * 10) / 10;
  }
  
  // UTC 정각으로 맞추기
  function hourStartUTC(date = new Date()) {
    const d = new Date(date);
    d.setUTCMinutes(0, 0, 0);
    return d;
  }
  
  exports.saveSnapshot = async (payload) => {
    const db = require('../models');
    const Weather = db?.Weather || db?.sequelize?.models?.Weather;
  
    if (!Weather) {
      const keys = Object.keys(db || {});
      console.error('[weatherSaver] Weather model not found. models keys:', keys);
      const err = new Error('Weather model is not registered. Check models/index.js registration.');
      err.code = 'MODEL_NOT_FOUND';
      throw err;
    }
  
    const {
      coords: { lat, lon, nx, ny },
      weather,
      sun,
      fetchedAt,
    } = payload;
  
    const doc = {
      lat, lon, nx, ny,
      hourStart: hourStartUTC(fetchedAt || new Date()),
      temperature:               round1(weather.temperature),
      feels_like:                round1(weather.feels_like),
      humidity:                  weather.humidity ?? null,
      precipitation_amount:      round1(weather.precipitation_amount),
      precipitation_probability: weather.precipitation_probability ?? null,
      wind_speed:                round1(weather.wind_speed),
      wind_direction:            weather.wind_direction ?? null,
      weather_condition:         weather.weather_condition ?? null,
      sunrise: sun?.sunrise ?? null,
      sunset:  sun?.sunset ?? null,
      civilTwilightBegin: sun?.civilTwilightBegin ?? null,
      civilTwilightEnd:   sun?.civilTwilightEnd ?? null,
      fetchedAt: fetchedAt ? new Date(fetchedAt) : new Date(),
      source: 'KMA + sunrise-sunset.org',
    };
  
    await Weather.upsert(doc);
    return doc;
  };
  