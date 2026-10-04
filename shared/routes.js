import {validCountry} from './countries.js';
export function routeDetails(b){
 const originCountry=b.originCountry||'TR',destinationCountry=b.destinationCountry||'SY';
 if(!validCountry(originCountry)||!validCountry(destinationCountry))throw new Error('Invalid route country');
 const transportType=originCountry==='TR'&&destinationCountry==='TR'?'domesticTR':originCountry==='SY'&&destinationCountry==='SY'?'domesticSY':['TR','SY'].includes(originCountry)&&['TR','SY'].includes(destinationCountry)?'crossBorder':'international';
 if(b.transportType&&b.transportType!==transportType)throw new Error('Transport type conflicts with countries');
 if(transportType==='crossBorder'&&!['bab','rai','kasab'].includes(b.crossing))throw new Error('Border crossing required');
 return {originCountry,destinationCountry,transportType,crossing:transportType==='crossBorder'?b.crossing:null};
}
