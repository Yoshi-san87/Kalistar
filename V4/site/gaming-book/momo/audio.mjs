export const melody=[329.63,392,440,523.25,493.88,392,329.63];

// Runtime and offline loudness QA use the same envelope and harmonics.
export function playFluteNote(context,index,settings,voices=new Set(),at=context.currentTime){
  const gain=context.createGain();
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(settings.peak,at+settings.attack);
  gain.gain.setValueAtTime(settings.peak,at+settings.hold);
  gain.gain.exponentialRampToValueAtTime(.0001,at+settings.release);
  gain.connect(context.destination);
  let remaining=2;
  for(const [harmonic,level] of [[1,1],[2,settings.harmonic]]){
    const oscillator=context.createOscillator(),partial=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=melody[index]*harmonic;partial.gain.value=level;
    oscillator.connect(partial);partial.connect(gain);voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();partial.disconnect();if(--remaining===0)gain.disconnect();};
    oscillator.start(at);oscillator.stop(at+settings.release+.03);
  }
}
