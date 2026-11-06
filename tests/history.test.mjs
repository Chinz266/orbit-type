import test from 'node:test';
import assert from 'node:assert/strict';
import {Session} from '../dist/engine.js';
import {loadHistory,saveHistory,summarize} from '../dist/history.js';
test('tracks wrong word, actual key and position including Thai marks',()=>{const s=new Session();s.setWord('ก่า');s.type('ก');s.type('้');s.type('่');s.type('า');s.setWord('star');s.type('z');assert.deepEqual(s.wordMistakes,[{word:'ก่า',position:1,expected:'่',typed:'้'},{word:'star',position:0,expected:'s',typed:'z'}]);s.reset();assert.deepEqual(s.wordMistakes,[]);});
test('history persists category and mistakes and aggregates weighted rates',()=>{let value;const storage={setItem:(k,v)=>value=v,getItem:()=>value};const rows=[{endedAt:new Date().toISOString(),category:'สัตว์',score:10,hits:10,errors:0,seconds:60,targets:1,mistakes:[]},{endedAt:new Date().toISOString(),category:'อาหาร',score:20,hits:30,errors:10,seconds:60,targets:3,mistakes:[]}];assert.equal(saveHistory(rows,storage),true);assert.deepEqual(loadHistory(storage),rows);assert.deepEqual(summarize(rows),{score:30,hits:40,errors:10,seconds:120,targets:4,accuracy:80,wpm:4});});
test('broken and unavailable storage does not prevent playing',()=>{assert.deepEqual(loadHistory({getItem:()=>'{'}),[]);assert.deepEqual(loadHistory({getItem:()=>'[null,{}]'}),[]);assert.equal(saveHistory([],{setItem(){throw Error('full');}}),false);});
