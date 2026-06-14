const { useState, useEffect, useRef } = React;

function useReminders(tasks) {
  const [active,setActive] = useState(null);
  useEffect(()=>{
    const check=()=>{
      const n=new Date();
      for(const t of tasks){
        if(t.done) continue;
        if(t.snoozedUntil && new Date(t.snoozedUntil)>n) continue;
        if(t.reminder){ const rt=new Date(t.reminder); if(rt<=n && rt> new Date(n.getTime()-60000)){ setActive(t); return; } }
      }
    };
    const id=setInterval(check,15000);
    check();
    return ()=>clearInterval(id);
  },[tasks]);
  return [active,()=>setActive(null)];
}

function useDayQuickAdd(onQuickAdd){
  const [addDate,setAddDate]=useState(null);
  const inputRef=useRef(null);
  const blurTimer=useRef(null);
  useEffect(()=>{ if(addDate) setTimeout(()=>inputRef.current?.focus(),0); },[addDate]);
  const handleCellClick=(e,ds,{draggingId,selectedSize})=>{
    if(draggingId||selectedSize>0) return;
    if(e.target.closest(".week-chip,.month-chip,.more-chip,.cell-quick-add")) return;
    clearTimeout(blurTimer.current);
    setAddDate(ds);
  };
  const submit=(ds,val)=>{
    if(val.trim()) onQuickAdd(ds,val.trim());
    setAddDate(null);
  };
  const renderQuickAdd=(ds)=>addDate===ds? (
    <input ref={inputRef} className="cell-quick-add" placeholder="משימה... (Enter)" dir="rtl"
      onClick={e=>e.stopPropagation()}
      onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); submit(ds,e.target.value); } if(e.key==="Escape"){ e.preventDefault(); setAddDate(null); } }}
      onBlur={()=>{ blurTimer.current=setTimeout(()=>setAddDate(null),120); }}/>
  ):null;
  const showHint=(ds,hasTasks)=>!addDate&&!hasTasks?(<div className="cell-add-hint">+</div>):null;
  return {addDate,handleCellClick,renderQuickAdd,showHint};
}
