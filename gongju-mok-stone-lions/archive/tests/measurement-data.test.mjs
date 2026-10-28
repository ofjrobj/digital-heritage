import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {measurements} from '../measurements.js';

const design=JSON.parse(await readFile(new URL('./fixtures/measurements-design.json',import.meta.url),'utf8'));
const withheld=new Set(['귀 크기','오른쪽 눈 길이','왼쪽 눈 길이']);

test('each observation retains its recorded measurements with female/male columns intact',()=>{
 assert.equal(measurements.length,design.length);
 design.forEach((reference,index)=>{
  const actual=measurements[index];
  assert.equal(actual.label,index===2?'등무늬':reference.label);
  assert.deepEqual(actual.rows.map(row=>row[0]),reference.rows.map(row=>row.term));
  reference.rows.forEach((row,rowIndex)=>{
   const value=actual.rows[rowIndex];
   assert.equal(parseFloat(value[1]),parseFloat(row.female),`${row.term}: female`);
   if(withheld.has(row.term)) assert.equal(value[2],null,`${row.term}: unverified male value is withheld`);
   else assert.equal(parseFloat(value[2]),parseFloat(row.male),`${row.term}: male`);
  });
 });
});

test('one disputed measurement does not suppress the other sculpture’s recorded value',()=>{
 const female=measurements.flatMap(note=>note.rows.filter(row=>row[1]!=null));
 const male=measurements.flatMap(note=>note.rows.filter(row=>row[2]!=null));
 for(const term of withheld){
  assert.ok(female.some(row=>row[0]===term));
  assert.ok(!male.some(row=>row[0]===term));
 }
});
