export class Session {
 constructor(){this.reset();}
 reset(){this.score=0;this.hits=0;this.errors=0;this.combo=0;this.targets=0;this.position=0;this.word='';this.mistakes={};this.wordMistakes=[];}
 setWord(word){this.word=word;this.position=0;}
 type(char){const expected=this.word[this.position];if(!expected)return {correct:false,complete:false};if(char!==expected){this.errors++;this.combo=0;this.wordMistakes.push({word:this.word,position:this.position,expected,typed:char});this.mistakes[expected]=(this.mistakes[expected]||0)+1;return {correct:false,complete:false};}this.hits++;this.position++;const complete=this.position===this.word.length;if(complete){this.combo++;this.targets++;this.score+=this.word.length*10+Math.min(this.combo,10)*5;}return {correct:true,complete};}
 accuracy(){return this.hits+this.errors?Math.round(this.hits/(this.hits+this.errors)*100):0;}
 wpm(seconds){return seconds>0?Math.round(this.hits/5/(seconds/60)):0;}
}
export const lessons={th:{home:['ฟหกด','เ่าส','หาก','ดาก','สาว','กาว','ฟาด','หาด','สาก','กด'],words:['ดาว','ยาน','อวกาศ','โลก','แสง','เดินทาง','จักรวาล','ท้องฟ้า','พระจันทร์','เรียนรู้','พลัง','นักบิน','ความฝัน','สำรวจ','ดวงอาทิตย์']},en:{home:['asdf','jkl;','fjfj','dad','sad','fall','ask','lad','salad','flask'],words:['orbit','star','moon','planet','rocket','galaxy','solar','comet','cosmic','explore','launch','dream','future','space','light']}};
