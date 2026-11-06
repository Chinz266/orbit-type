import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,getWordBank,shuffled,shiftedThaiRows} from '../dist/vocabulary.js';
import {lessons,Session} from '../dist/engine.js';
test('18 categories have 20 unique playable words in both languages',()=>{
 assert.equal(categories.length,18);assert.equal(new Set(categories.map(c=>c.id)).size,18);
 const thaiKeys='ๅ/-ภถุึคตจขชๆไำพะัีรนยบลฟหกดเ้่าสวงผปแอิืทมใฝ'+shiftedThaiRows.join('');
 for(const category of categories)for(const lang of ['th','en']){
  const words=category[lang];assert.equal(words.length,20,category.id);assert.equal(new Set(words).size,20);
  for(const word of words){assert.ok(!/\s/.test(word));if(lang==='th')for(const c of word)assert.ok(thaiKeys.includes(c),`${category.id}: missing key ${c}`);else assert.match(word,/^[a-z]+$/);const s=new Session();s.setWord(word);for(const c of word)s.type(c);assert.equal(s.targets,1);}
 }
});
test('category routing preserves home and space and isolates other banks',()=>{
 for(const lang of ['th','en']){assert.deepEqual(getWordBank(lang,'home','mixed',lessons),lessons[lang].home);assert.deepEqual(getWordBank(lang,'words','space',lessons),lessons[lang].words);for(const c of categories)assert.deepEqual(getWordBank(lang,'words',c.id,lessons),c[lang]);const all=getWordBank(lang,'words','mixed',lessons);assert.ok(all.length>300);assert.equal(new Set(all).size,all.length);}
});
test('shuffle retains every word without mutating its bank',()=>{const bank=['cat','dog','bird','fish'];const result=shuffled(bank,()=>0);assert.deepEqual(bank,['cat','dog','bird','fish']);assert.notDeepEqual(result,bank);assert.deepEqual([...result].sort(),[...bank].sort());});
