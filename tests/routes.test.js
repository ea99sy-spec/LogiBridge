import test from 'node:test';
import assert from 'node:assert/strict';
import {routeDetails} from '../shared/routes.js';
test('domestic routes need no border crossing; both cross-border directions require one',()=>{
 for(const [country,type]of [['TR','domesticTR'],['SY','domesticSY']]){const r=routeDetails({originCountry:country,destinationCountry:country,transportType:type,crossing:'bab'});assert.equal(r.transportType,type);assert.equal(r.crossing,null)}
 for(const [originCountry,destinationCountry]of [['TR','SY'],['SY','TR']]){assert.equal(routeDetails({originCountry,destinationCountry,crossing:'rai'}).transportType,'crossBorder');assert.throws(()=>routeDetails({originCountry,destinationCountry}));}
 assert.throws(()=>routeDetails({originCountry:'TR',destinationCountry:'SY',transportType:'domesticTR',crossing:'bab'}));assert.equal(routeDetails({originCountry:'DE',destinationCountry:'FR'}).crossing,null);
});
