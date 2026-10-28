import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {measurements,overallMeasurements,originalNotation} from '../measurements.js';

const design=JSON.parse(await readFile(new URL('./fixtures/measurements-design.json',import.meta.url),'utf8'));
const document=JSON.parse(await readFile(new URL('./fixtures/measurements-document.json',import.meta.url),'utf8'));

test('each observation retains its recorded measurements with female/male columns intact',()=>{
 assert.equal(measurements.length,document.features.length);
 document.features.forEach((reference,index)=>{
  const actual=measurements[index];
  assert.equal(actual.label,reference.label);
  assert.deepEqual(actual.rows.map(row=>row[0]),reference.rows.map(row=>row.term));
  reference.rows.forEach((row,rowIndex)=>{
   const value=actual.rows[rowIndex];
   assert.equal(value[1],row.female,`${row.term}: female value and unit`);
   assert.equal(value[2],row.male,`${row.term}: male value and unit`);
  });
 });
});

test('the original design values remain present, with unusual source notation identified',()=>{
 design.forEach((reference,index)=>reference.rows.forEach(row=>{
  const actual=measurements[index].rows.find(value=>value[0]===row.term);
  assert.equal(parseFloat(actual[1]),parseFloat(row.female));
  assert.equal(parseFloat(actual[2]),parseFloat(row.male));
 }));
 assert.deepEqual(originalNotation,document.originalNotation);
});

test('overall dimensions include the source foot and tail sizes',()=>{
 assert.deepEqual(overallMeasurements,document.overall.map(row=>[row.term,row.female,row.male]));
});
