const { useState, useEffect, useLayoutEffect, useRef } = React;

function TimeInput24({value,onChange,className,selectClassName,id,title,style}){
  const [open,setOpen]=useState(false);
  const wrapRef=useRef(null);
  const normalized=normTime(value);
  const display=normalized||"--:--";
  const shiftTime=(base,delta)=>{
    const t=normTime(base)||"00:00";
    const [h,m]=t.split(":").map(Number);
    let total=h*60+m+delta;
    total=((total%1440)+1440)%1440;
    return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
  };
  useEffect(()=>{
    if(!open) return;
    const close=e=>{ if(wrapRef.current&&!wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",close);
    return ()=>document.removeEventListener("mousedown",close);
  },[open]);
  useEffect(()=>{
    if(!open||!wrapRef.current) return;
    const sel=wrapRef.current.querySelector(".time-input-24-opt.sel");
    if(sel) sel.scrollIntoView({block:"nearest"});
  },[open,normalized]);
  return(
    <div ref={wrapRef} className={"time-input-24"+(className?" "+className:"" )} id={id} title={title} style={style}>
      <button type="button" className={"time-input-24-btn"+(selectClassName?" "+selectClassName:""
        )+(open?" open":"")} onClick={()=>setOpen(o=>!o)} aria-label="בחירת שעה" aria-expanded={open} aria-haspopup="listbox">
        <span>{display}</span>
        <span className="time-input-24-chevron" aria-hidden="true">▾</span>
      </button>
      {open&&(
        <div className="time-input-24-panel" role="listbox" aria-label="בורר זמן">
          <div className="time-input-24-scroll">
            <button type="button" role="option" className={"time-input-24-opt clear"+(!normalized?" sel":"")} onClick={()=>{onChange("");setOpen(false);}}>ללא שעה</button>
            {TIMES_15.map(t=>(
              <div key={t} role="option" aria-selected={normalized===t} className={"time-input-24-opt"+(normalized===t?" sel":"")} tabIndex={0} onClick={()=>{onChange(t);setOpen(false);}} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onChange(t); setOpen(false); } }}>
                <span>{t}</span>
                <span className="time-input-24-precise">
                  <button type="button" className="time-input-24-precise-btn left" onClick={e=>{e.stopPropagation(); onChange(shiftTime(t,-1));}}>−</button>
                  <button type="button" className="time-input-24-precise-btn right" onClick={e=>{e.stopPropagation(); onChange(shiftTime(t,1));}}>+</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewProjectModal({project,onSave,onClose}){
  const [name,setName]=useState(project?.name||"");
  const [emoji,setEmoji]=useState(project?.emoji||"📁");
  const [color,setColor]=useState(project?.color||PROJ_COLORS[0]);
  const save=()=>{ if(!name.trim()) return; onSave({id:project?.id||uid(),name:name.trim(),emoji,color}); };
  return (
    <div className="proj-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="proj-modal">
        <h3>{project?"✏️ ערוך פרויקט":"➕ פרויקט חדש"}</h3>
        <div className="proj-modal-field">
          <label className="proj-modal-label">שם הפרויקט</label>
          <input className="proj-modal-input" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="שם הפרויקט..." dir="rtl" autoFocus/>
        </div>
        <div className="proj-modal-field">
          <label className="proj-modal-label">אייקון</label>
          <div className="emoji-picker">
            {PROJ_EMOJIS.map(e=>(
              <div key={e} className={"emoji-opt"+(emoji===e?" sel":"")} onClick={()=>setEmoji(e)}>{e}</div>
            ))}
          </div>
        </div>
        <div className="proj-modal-field">
          <label className="proj-modal-label">צבע</label>
          <div className="color-picker">
            {PROJ_COLORS.map(c=>(
              <div key={c} className={"color-opt"+(color===c?" sel":"")} style={{background:c}} onClick={()=>setColor(c)}/>
            ))}
          </div>
        </div>
        <div className="proj-modal-footer">
          <button className="proj-modal-cancel" onClick={onClose}>ביטול</button>
          <button className="proj-modal-save" onClick={save}>{project?"שמור שינויים":"צור פרויקט"}</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({task,projects,onSave,onDelete,onClose}){
  const [t,setT]=useState({...task,subtasks:task.subtasks||[],dueTime:task.dueTime||"",recur:task.recur||{type:"none"}});
  const [newSub,setNewSub]=useState("");
  const [openChip,setOpenChip]=useState(null);
  const titleId="task-modal-title";
  const titleRef=useRef(null);
  const chipsRef=useRef(null);
  const resizeTitle=()=>{const el=titleRef.current;if(!el)return;el.style.height="auto";el.style.height=el.scrollHeight+"px";};
  const setField=(k,v)=>setT(p=>({...p,[k]:v}));
  const remParts=parseReminder(t.reminder);
  const toggleChip=key=>setOpenChip(p=>p===key?null:key);
  const changeRecurType=type=>setT(p=>{
    if(type==="custom"){
      return {
        ...p,
        recur:{
          ...p.recur,
          type:"custom",
          unit:p.recur?.unit||"week",
          interval:p.recur?.interval||1,
          days:p.recur?.days?.length? p.recur.days : [new Date().getDay()]
        }
      };
    }
    return {...p,recur:{...p.recur,type}};
  });
  const toggleRecurDay=day=>setT(p=>{
    const days=p.recur?.days||[];
    const next=days.includes(day)?days.filter(d=>d!==day):[...days,day];
    return {...p,recur:{...p.recur,type:"custom",days:next}};
  });
  const toggleSub=id=>setT(p=>({...p,subtasks:p.subtasks.map(s=>s.id===id?{...s,done:!s.done}:s)}));
  const addSub=()=>{ if(!newSub.trim()) return; setT(p=>({...p,subtasks:[...p.subtasks,{id:uid(),title:newSub.trim(),done:false}]})); setNewSub(""); };
  const delSub=id=>setT(p=>({...p,subtasks:p.subtasks.filter(s=>s.id!==id)}));
  const doneSubs=t.subtasks.filter(s=>s.done).length;
  const subPct=t.subtasks.length?Math.round(doneSubs/t.subtasks.length*100):0;
  const pri=PRIORITIES[t.priority]||PRIORITIES.medium;
  const proj=projects.find(p=>p.id===t.projectId);
  useEffect(()=>{
    const onKey=e=>{ if(e.key==="Escape") onClose(); };
    document.addEventListener("keydown",onKey);
    return ()=>document.removeEventListener("keydown",onKey);
  },[onClose]);
  useEffect(()=>{resizeTitle();},[t.title]);
  useEffect(()=>{ if(t.reminder) requestNotifPermission(); },[t.reminder]);
  useEffect(()=>{
    if(!openChip) return;
    const close=e=>{if(chipsRef.current&&!chipsRef.current.contains(e.target))setOpenChip(null);};
    document.addEventListener("mousedown",close);
    return ()=>document.removeEventListener("mousedown",close);
  },[openChip]);
  useLayoutEffect(()=>{
    if(!openChip||!chipsRef.current) return;
    const wrap=chipsRef.current.querySelector(`[data-chip="${openChip}"]`);
    const btn=wrap?.querySelector(".chip-btn");
    const panel=wrap?.querySelector(".chip-popover-panel");
    if(!btn||!panel) return;
    const place=()=>{
      const r=btn.getBoundingClientRect();
      panel.style.top=(r.bottom+6)+"px";
      panel.style.right=(window.innerWidth-r.right)+"px";
    };
    place();
    window.addEventListener("resize",place);
    window.addEventListener("scroll",place,true);
    return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
  },[openChip]);
  const recurLabel=getRecurLabel(t.recur);
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e=>e.stopPropagation()}>
        <div className="modal-accent" style={{background:pri.color}} aria-hidden="true"/>
        <div className="modal-header">
          <div className="modal-header-top">
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="סגור">✕</button>
          </div>
          <div className="modal-header-main">
            <textarea id={titleId} ref={titleRef} className="modal-title-input" value={t.title} onChange={e=>{setField("title",e.target.value);resizeTitle();}} rows={1} dir="rtl" placeholder="שם המשימה..." aria-label="שם המשימה"/>
            <div className="modal-header-meta" ref={chipsRef}>
              <div className="chip-popover-wrap" data-chip="priority">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="priority"?" open":"")} style={{background:pri.bg,color:pri.color}} onClick={()=>toggleChip("priority")} aria-expanded={openChip==="priority"} aria-haspopup="listbox">
                  {pri.label}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="priority"&&(
                  <div className="chip-popover-panel" role="listbox" aria-label="עדיפות">
                    {Object.entries(PRIORITIES).map(([k,v])=>(
                      <button key={k} type="button" role="option" aria-selected={t.priority===k} className={"chip-popover-opt"+(t.priority===k?" sel":"")} style={t.priority===k?{color:v.color}:undefined} onClick={()=>{setField("priority",k);setOpenChip(null);}}>{v.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="chip-popover-wrap" data-chip="project">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="project"?" open":"")+( !proj?" muted":"" )} onClick={()=>toggleChip("project")} aria-expanded={openChip==="project"} aria-haspopup="listbox">
                  {proj?`${proj.emoji} ${proj.name}`:"📁 פרויקט"}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="project"&&(
                  <div className="chip-popover-panel" role="listbox" aria-label="פרויקט">
                    {projects.map(p=>(
                      <button key={p.id} type="button" role="option" aria-selected={t.projectId===p.id} className={"chip-popover-opt"+(t.projectId===p.id?" sel":"")} onClick={()=>{setField("projectId",p.id);setOpenChip(null);}}>{p.emoji} {p.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="chip-popover-wrap" data-chip="date">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="date"?" open":"")+( !t.dueDate?" muted":"" )} onClick={()=>toggleChip("date")} aria-expanded={openChip==="date"} aria-haspopup="dialog">
                  📅 {t.dueDate?t.dueDate:"תאריך"}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="date"&&(
                  <div className="chip-popover-panel" role="dialog" aria-label="תאריך יעד">
                    <div className="chip-popover-field">
                      <label className="chip-popover-label" htmlFor="tm-chip-date">תאריך יעד</label>
                      <input id="tm-chip-date" type="date" className="modal-input" value={t.dueDate||""} onChange={e=>setField("dueDate",e.target.value)}/>
                    </div>
                    {t.dueDate&&<button type="button" className="chip-popover-clear" onClick={()=>{setField("dueDate","");setOpenChip(null);}}>ללא תאריך</button>}
                  </div>
                )}
              </div>
              <div className="chip-popover-wrap" data-chip="time">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="time"?" open":"")+( !t.dueTime?" muted":"" )} onClick={()=>toggleChip("time")} aria-expanded={openChip==="time"} aria-haspopup="listbox">
                  🕐 {t.dueTime||"שעה"}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="time"&&(
                  <div className="chip-popover-panel" role="listbox" aria-label="שעה">
                    <TimeInput24 selectClassName="modal-input" value={t.dueTime||""} onChange={v=>setField("dueTime",v)}/>
                    {t.dueTime&&<button type="button" className="chip-popover-clear" onClick={()=>{setField("dueTime","");setOpenChip(null);}}>ללא שעה</button>}
                  </div>
                )}
              </div>
              <div className="chip-popover-wrap" data-chip="reminder">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="reminder"?" open":"")+( !t.reminder?" muted":"" )} onClick={()=>toggleChip("reminder")} aria-expanded={openChip==="reminder"} aria-haspopup="dialog">
                  ⏰ {t.reminder?fmtDateTime(t.reminder):"תזכורת"}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="reminder"&&(
                  <div className="chip-popover-panel chip-popover-panel--reminder" role="dialog" aria-label="תזכורת">
                    <div className="chip-popover-field">
                      <label className="chip-popover-label" htmlFor="tm-chip-rem-date">תאריך</label>
                      <input id="tm-chip-rem-date" type="date" className="modal-input" value={remParts.date} onChange={e=>setField("reminder",buildReminder(e.target.value,remParts.time))}/>
                    </div>
                    <div className="chip-popover-field">
                      <span className="chip-popover-label">שעה</span>
                      <TimeInput24 selectClassName="modal-input" value={remParts.time} onChange={v=>setField("reminder",buildReminder(remParts.date||t.dueDate||today(),v))}/>
                    </div>
                    {t.reminder&&<button type="button" className="chip-popover-clear" onClick={()=>{setField("reminder",null);setOpenChip(null);}}>ללא תזכורת</button>}
                  </div>
                )}
              </div>
              <div className="chip-popover-wrap" data-chip="recur">
                <button type="button" className={"modal-meta-chip chip-btn"+(openChip==="recur"?" open":"")+( !recurLabel?" muted":"" )} onClick={()=>toggleChip("recur")} aria-expanded={openChip==="recur"} aria-haspopup="dialog">
                  {recurLabel||"🔁 חזרה"}<span className="chip-chevron" aria-hidden="true">▾</span>
                </button>
                {openChip==="recur"&&(
                  <div className="chip-popover-panel chip-popover-panel--recur" role="dialog" aria-label="חזרה">
                    <div className="seg-btns" role="group" aria-label="סוג חזרה">
                      {RECUR_OPTIONS.map(o=>(
                        <button key={o.key} type="button" className={"seg-btn"+((t.recur?.type||"none")===o.key?" sel":"")} onClick={()=>changeRecurType(o.key)} aria-pressed={(t.recur?.type||"none")===o.key}>
                          {o.icon&&<span className="seg-btn-ico" aria-hidden="true">{o.icon}</span>}
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {t.recur?.type==="custom"&&(
                      <div className="weekday-grid" role="group" aria-label="ימים בשבוע">
                        {DAYS_HE.map((day,idx)=>(
                          <button key={day} type="button" className={"weekday-btn"+(t.recur.days?.includes(idx)?" sel":"")} onClick={()=>toggleRecurDay(idx)} aria-pressed={t.recur.days?.includes(idx)} title={day}>
                            <span className="weekday-label">{DAYS_SHORT[idx]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {(t.recur?.type&&t.recur.type!=="none")&&<button type="button" className="chip-popover-clear" onClick={()=>{changeRecurType("none");setOpenChip(null);}}>ללא חזרה</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-header-sections">
          <section className="modal-section" aria-labelledby="tm-sec-notes">
            <div className="modal-section-head">
              <span className="modal-section-icon" aria-hidden="true">📝</span>
              <h3 className="modal-section-title" id="tm-sec-notes">הערות</h3>
            </div>
            <textarea className="modal-input modal-textarea" value={t.notes||""} onChange={e=>setField("notes",e.target.value)} dir="rtl" placeholder="הוסף הערות, קישורים או פרטים נוספים..." aria-label="הערות"/>
          </section>
          <section className="modal-section" aria-labelledby="tm-sec-subtasks">
            <div className="modal-section-head">
              <span className="modal-section-icon" aria-hidden="true">✅</span>
              <h3 className="modal-section-title" id="tm-sec-subtasks">משימות משנה</h3>
              {t.subtasks.length>0&&<span className="modal-section-sub">{doneSubs} מתוך {t.subtasks.length}</span>}
            </div>
            <div className="modal-card">
              {t.subtasks.length>0&&(
                <div className="modal-subtasks-header">
                  <span className="modal-subtasks-count">התקדמות</span>
                  <span className="modal-subtasks-pct">{subPct}%</span>
                </div>
              )}
              {t.subtasks.length>0&&<div className="progress-bar-wrap" role="progressbar" aria-valuenow={subPct} aria-valuemin={0} aria-valuemax={100} aria-label="התקדמות משימות משנה"><div className="progress-bar-fill" style={{width:subPct+"%"}}/></div>}
              <ul className="subtask-list" aria-label="רשימת משימות משנה">
                {t.subtasks.map(s=>(
                  <li key={s.id} className="modal-subtask-item">
                    <div className={"stcb"+(s.done?" checked":"")} onClick={()=>toggleSub(s.id)} role="checkbox" aria-checked={s.done} tabIndex={0} onKeyDown={e=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),toggleSub(s.id));}} aria-label={s.title}/>
                    <span className="modal-subtask-title" style={{textDecoration:s.done?"line-through":"none",color:s.done?"var(--text3)":"inherit"}}>{s.title}</span>
                    <button type="button" className="modal-subtask-del" onClick={()=>delSub(s.id)} aria-label={"מחק: "+s.title}>✕</button>
                  </li>
                ))}
              </ul>
              <div className="subtask-input-row">
                <input value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="הוסף משימת משנה..." dir="rtl" aria-label="משימת משנה חדשה"/>
                <button type="button" onClick={addSub}>הוסף</button>
              </div>
            </div>
          </section>
        </div>
        <div className="modal-scroll">
          <section className="modal-section">
            <label className="modal-pin-row" htmlFor="tm-pinned">
              <div className="modal-pin-info">
                <span className="modal-pin-icon" aria-hidden="true">📌</span>
                <div>
                  <div className="modal-pin-text">נעוץ לראש הרשימה</div>
                  <div className="modal-pin-sub">המשימה תופיע תמיד בראש הקבוצה</div>
                </div>
              </div>
              <div className="modal-toggle">
                <input id="tm-pinned" type="checkbox" checked={t.pinned||false} onChange={e=>setField("pinned",e.target.checked)}/>
                <span className="modal-toggle-track" aria-hidden="true"/>
              </div>
            </label>
          </section>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-del" onClick={()=>onDelete(t.id)} aria-label="מחק משימה">
            <span aria-hidden="true">🗑</span> מחק
          </button>
          <div className="modal-footer-actions">
            <button type="button" className="btn-save" onClick={()=>onSave(t)}>שמור שינויים</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({task,onEdit,onToggle,onPin,onDelete,getProjColor,getProjName,leavingTasks={},onGlobalDragStart,onGlobalDragEnd,onDragStartExtra,onDragEndExtra,onDragOver,onDragEnter,onDragLeave,onDrop,dragClassName,dragStyle}){
  const isOverdue=task.dueDate&&task.dueDate<today()&&!task.done;
  const isToday=task.dueDate===today()&&!task.done;
  const doneC=task.subtasks?.filter(s=>s.done).length||0;
  const totS=task.subtasks?.length||0;
  const leaveType=leavingTasks[task.id];
  return (
    <div className={"task-item"+(task.done?" done-task":"")+(task.pinned?" pinned-task":"")+(leaveType?` leaving-${leaveType}`:"")+(dragClassName?` ${dragClassName}`:"")}
      style={dragStyle}
      draggable={!task.done && !task.deleted}
      onDragStart={e=>{
        if(task.done||task.deleted) return;
        e.dataTransfer.setData("text/plain", JSON.stringify({ids:[task.id]}));
        e.dataTransfer.effectAllowed="move";
        onGlobalDragStart?.([task.id]);
        onDragStartExtra?.(e,task);
      }}
      onDragEnd={e=>{ onDragEndExtra?.(e); onGlobalDragEnd?.(); }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={()=>onEdit(task)}>
      <div className={"task-cb"+(task.done?" checked":"")} onClick={e=>{e.stopPropagation();onToggle(task.id);}}/>
      <div className="task-body">
        <div className="task-title" style={{display:"flex",alignItems:"center",gap:6}}>
          {task.pinned&&<span className="pin-icon">📌</span>}
          <span className={task.done?"done-text":""}>{task.title}</span>
        </div>
        <div className="task-meta">
          {task.dueDate&&<span className={"task-date"+(isOverdue?" overdue":isToday?" today-due":"")}>{isOverdue?"⚠️":isToday?"🔔":"📅"} {fmtDate(task.dueDate)}{task.dueTime?` · ${fmtTime(task.dueTime)}`:""}</span>}
          {task.reminder&&<span className="task-date">⏰ {fmtDateTime(task.reminder)}</span>}
          <span className="proj-badge" style={{borderRight:`2px solid ${getProjColor(task.projectId)}`}}>{getProjName(task.projectId)}</span>
          <span className="pri-badge" style={{background:PRIORITIES[task.priority].bg,color:PRIORITIES[task.priority].color}}>{PRIORITIES[task.priority].label}</span>
          {totS>0&&<span className="task-date">{doneC}/{totS} משימות משנה</span>}
          {task.notes&&<span className="task-date">📝</span>}
          {getRecurLabel(task.recur)&&<span className="recur-badge">{getRecurLabel(task.recur)}</span>}
        </div>
        {totS>0&&!task.done&&<div className="progress-bar-wrap" style={{marginTop:5,width:120}}><div className="progress-bar-fill" style={{width:(doneC/totS*100)+"%"}}/></div>}
      </div>
      <div className="task-actions" onClick={e=>e.stopPropagation()}>
        <button className="icon-btn" onClick={()=>onPin(task.id)}>{task.pinned?"📌":"📍"}</button>
        <button className="icon-btn del" onClick={()=>onDelete(task.id)}>🗑</button>
      </div>
    </div>
  );
}

function HistoryListView({tasks,getProjColor,getProjName,onRestore,onDeletePermanent,projects}){
  const [selected,setSelected]=useState([]);
  const [historyType,setHistoryType]=useState("completed");
  const filteredTasks=tasks.filter(t=>t.deletedReason===historyType);
  const toggleSelect=id=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const selectAll=()=>setSelected(filteredTasks.map(t=>t.id));
  const clearSelection=()=>setSelected([]);
  const hasSelection=selected.length>0;
  const projectMap=Object.fromEntries(projects.map(p=>[p.id,p]));

  return (
    <div>
      <div className="filter-bar history-actions" style={{marginBottom:16,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button className={"filter-btn"+(historyType==="completed"?" active":"")} onClick={()=>{setHistoryType("completed"); clearSelection();}}>✅ הושלמו</button>
          <button className={"filter-btn"+(historyType==="deleted"?" active":"")} onClick={()=>{setHistoryType("deleted"); clearSelection();}}>🗑️ נמחקו</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button className="tb-btn" onClick={()=>{ if(hasSelection){ onDeletePermanent(selected); clearSelection(); } else { selectAll(); } }}>{hasSelection?`מחק נבחרים (${selected.length})`:"בחר הכל"}</button>
          <button className="tb-btn del" onClick={()=>{ if(window.confirm('האם למחוק לצמיתות את כל המשימות בעמוד זה?')){ onDeletePermanent(filteredTasks.map(t=>t.id)); clearSelection(); } }}>מחק הכל לצמיתות</button>
        </div>
      </div>
      {filteredTasks.length===0 ? (
        <div className="empty"><div className="emoji">{historyType==="completed"?"✅":"🗑️"}</div><p>{historyType==="completed"?"אין משימות שהושלמו":"אין משימות שנמחקו"}</p></div>
      ) : Object.entries(filteredTasks.reduce((groups,t)=>{
        const key=t.projectId||"__no_project__";
        if(!groups[key]) groups[key]=[];
        groups[key].push(t);
        return groups;
      },{})).map(([projId,projTasks])=>{
        const proj=projectMap[projId] || {id:projId,name:"ללא פרויקט",color:"#999",emoji:"❔"};
        return (
          <div key={projId} style={{marginBottom:20}}>
            <div className="group-header">
              <span style={{width:10,height:10,borderRadius:"50%",background:proj.color,display:"inline-block",flexShrink:0}}/>
              <h3>{proj.emoji} {proj.name}</h3>
              <span className="group-count">{projTasks.length}</span>
            </div>
            {projTasks.map(t=>{
              const isSelected=selected.includes(t.id);
              return (
                <div key={t.id} className="task-item" style={{opacity:0.8}}>
                  <label style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%",cursor:"pointer"}}>
                    <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(t.id)} style={{marginTop:4,accent:"var(--accent)"}} />
                    <div className="task-body" style={{flex:1}}>
                      <div className="task-title" style={{display:"flex",alignItems:"center",gap:6}}>
                        <span className="done-text">{t.title}</span>
                        {historyType==="completed"&&<span style={{fontSize:12,color:"var(--accent)",fontWeight:600}}>✓ הושלם</span>}
                      </div>
                      <div className="task-meta">
                        <span className="task-date">📅 {fmtDate(t.createdAt)}</span>
                        <span className="task-date">{historyType==="completed"?"✅":"🗑"} {fmtDate(t.deletedAt)}</span>
                        <span className="proj-badge" style={{borderRight:`2px solid ${getProjColor(t.projectId)}`}}>{getProjName(t.projectId)}</span>
                        <span className="pri-badge" style={{background:PRIORITIES[t.priority].bg,color:PRIORITIES[t.priority].color}}>{PRIORITIES[t.priority].label}</span>
                      </div>
                    </div>
                  </label>
                  <div className="task-actions" style={{opacity:1}}>
                    <button className="icon-btn" onClick={()=>onRestore(t.id)} title="שחזור משימה">↩️</button>
                    <button className="icon-btn del" onClick={()=>onDeletePermanent(t.id)} title="מחק לצמיתות">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TodayView({tasks,onEdit,onToggle,onPin,onDelete,onReorder,getProjColor,getProjName,projects,leavingTasks,onGlobalDragStart,onGlobalDragEnd}){
  const [activeDate,setActiveDate]=useState(today());
  const [draggingId,setDraggingId]=useState(null);
  const [dragOver,setDragOver]=useState({taskId:null,position:"after"});
  const [hoveringEmpty,setHoveringEmpty]=useState(false);
  const displayedTasks = tasks.filter(t=>!t.done&&t.dueDate===activeDate).sort((a,b)=>{
    const ao=typeof a.order==='number'?a.order:9999;
    const bo=typeof b.order==='number'?b.order:9999;
    if(ao!==bo) return ao-bo;
    return (a.dueTime||"9999")>(b.dueTime||"9999")?1:-1;
  });
  const formattedDate = new Intl.DateTimeFormat('he',{weekday:'long', day:'numeric', month:'long'}).format(parseDate(activeDate));
  const parseDragData = e=>{
    try{ const raw = e.dataTransfer.getData("text/plain"); return raw?JSON.parse(raw):null; }catch{return null;}
  };
  const handleDragStart = (e,t)=>{ setDraggingId(t.id); setDragOver({taskId:t.id,position:"after"}); };
  const handleDragEnd = ()=>{ setDraggingId(null); setDragOver({taskId:null,position:"after"}); setHoveringEmpty(false); onGlobalDragEnd?.(); };
  const getDropPosition = (e, target)=>{
    const rect = target.getBoundingClientRect();
    return e.clientY - rect.top < rect.height / 2 ? "before" : "after";
  };
  const handleTaskDragOver = (e,t)=>{
    e.preventDefault(); if(draggingId===t.id) return;
    const pos = getDropPosition(e, e.currentTarget);
    if(dragOver.taskId!==t.id || dragOver.position!==pos) setDragOver({taskId:t.id,position:pos});
    setHoveringEmpty(false);
  };
  const handleTaskDrop = (e,t)=>{
    e.preventDefault();
    e.stopPropagation();
    const data = parseDragData(e); if(!data||!data.ids?.length) return;
    const draggedId = data.ids[0]; if(draggedId===t.id) return;
    const position = getDropPosition(e, e.currentTarget);
    onReorder(draggedId,t.id,position,activeDate);
    handleDragEnd();
  };
  const handleListDragOver = e=>{
    e.preventDefault();
    if(e.target!==e.currentTarget) return;
    if(displayedTasks.length===0){
      if(dragOver.taskId!==null || dragOver.position!=="end") setDragOver({taskId:null,position:"end"});
      setHoveringEmpty(true);
      return;
    }
    const lastTask = e.currentTarget.lastElementChild;
    if(lastTask){
      const lastRect = lastTask.getBoundingClientRect();
      if(e.clientY > lastRect.bottom){
        if(dragOver.taskId!==null || dragOver.position!=="end") setDragOver({taskId:null,position:"end"});
        setHoveringEmpty(true);
      }
    }
  };
  const handleListDrop = e=>{
    e.preventDefault();
    if(e.target!==e.currentTarget) return;
    const data=parseDragData(e); if(!data||!data.ids?.length) return;
    onReorder(data.ids[0],null,"end",activeDate);
    handleDragEnd();
  };

  return (
    <div>
      <div className="week-nav" style={{marginBottom:16}}>
        <button className="week-nav-btn" onClick={()=>setActiveDate(d=>offsetDate(d,-1))}>← יום קודם</button>
        <button className="week-nav-btn" onClick={()=>setActiveDate(today())}>היום</button>
        <button className="week-nav-btn" onClick={()=>setActiveDate(d=>offsetDate(d,1))}>יום הבא →</button>
        <h3>{formattedDate}</h3>
      </div>

      <div className={"today-list"+(hoveringEmpty?" drag-over":"")} onDragOver={handleListDragOver} onDragLeave={()=>setHoveringEmpty(false)} onDrop={handleListDrop}>
        {displayedTasks.length===0 ? (
          <div className="empty"><div className="emoji">☀️</div><p>אין משימות ליום זה</p></div>
        ) : displayedTasks.map(t=>{
          const isActiveDrop = dragOver.taskId===t.id;
          const dragClass = isActiveDrop ? (dragOver.position==="before"?"drag-over-before":"drag-over-after") : "";
          return (
            <TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} onPin={onPin} onDelete={onDelete} getProjColor={getProjColor} getProjName={getProjName} leavingTasks={leavingTasks} onGlobalDragStart={onGlobalDragStart} onGlobalDragEnd={onGlobalDragEnd} onDragStartExtra={handleDragStart} onDragEndExtra={handleDragEnd} onDragOver={e=>handleTaskDragOver(e,t)} onDragEnter={e=>handleTaskDragOver(e,t)} onDrop={e=>handleTaskDrop(e,t)} dragClassName={dragClass} dragStyle={draggingId===t.id?{opacity:0.45}:undefined} />
          );
        })}
      </div>
    </div>
  );
}
function WeekView({tasks,offset,setOffset,onEdit,onReschedule,onRescheduleMany,onQuickAdd,onReorder,getProjColor,leavingTasks,onGlobalDragStart,onGlobalDragEnd}){
  const [draggingId,setDraggingId]=useState(null);
  const [overDate,setOverDate]=useState(null);
  const [dragOverTask,setDragOverTask]=useState({taskId:null,position:"after"});
  const [selected,setSelected]=useState(new Set());
  const dragTask=useRef(null);
  const longPressTimer=useRef(null);
  const {addDate,handleCellClick,renderQuickAdd,showHint}=useDayQuickAdd(onQuickAdd);
  const weekDates=getWeekDates(offset);
  const todayStr=today();
  const startDate=weekDates[0];
  const endDate=weekDates[6];
  const weekLabel = `${DAYS_HE[startDate.getDay()]} ${startDate.getDate()} - ${DAYS_HE[endDate.getDay()]} ${endDate.getDate()} ${MONTHS_HE[endDate.getMonth()]}`;

  const handleDragStart=(e,t)=>{ 
    dragTask.current=t; 
    setDraggingId(t.id); 
    e.dataTransfer.setData("text/plain", JSON.stringify({ids:selected.size>0 ? [...selected] : [t.id]})); 
    e.dataTransfer.effectAllowed="move"; 
    onGlobalDragStart?.(selected.size>0 ? [...selected] : [t.id]);
  };
  const handleDragEnd=()=>{
    const dropped=onGlobalDragEnd?.();
    if(dropped) setSelected(new Set());
    setDraggingId(null); setOverDate(null); setDragOverTask({taskId:null,position:"after"}); dragTask.current=null;
  };
  const handleDrop=(e,ds)=>{
    e.preventDefault();
    if(!dragTask.current){
      setOverDate(null);
      return;
    }
    if(selected.size>0){
      onReorder([...selected],null,"end",ds);
      setSelected(new Set());
    } else if(dragTask.current.dueDate===ds){
      onReorder(dragTask.current.id,null,"end",ds);
    } else if(dragTask.current.dueDate!==ds){
      onReschedule(dragTask.current.id,ds);
    }
    setOverDate(null);
    setDragOverTask({taskId:null,position:"after"});
    setDraggingId(null);
    dragTask.current=null;
  };
  const handleTouchStart=(e,t)=>{ longPressTimer.current=setTimeout(()=>{ dragTask.current=t; setDraggingId(t.id); },500); };
  const handleTouchEnd=()=>{ clearTimeout(longPressTimer.current); };
  const handleChipDragOver=(e,t,ds)=>{
    e.preventDefault();
    if(!dragTask.current || dragTask.current.id===t.id) return;
    const rect=e.currentTarget.getBoundingClientRect();
    const pos=e.clientY-rect.top < rect.height*0.45 ? "before" : "after";
    if(dragOverTask.taskId!==t.id || dragOverTask.position!==pos) setDragOverTask({taskId:t.id,position:pos});
  };
  const handleChipLeave=()=>{ setDragOverTask({taskId:null,position:"after"}); };
  const handleChipDrop=(e,t,ds)=>{
    e.preventDefault();
    if(!dragTask.current) return;
    const draggedId = dragTask.current.id;
    const position = dragOverTask.taskId===t.id ? dragOverTask.position : "after";
    if(selected.size>0){
      const selectedIds = [...selected];
      if(selectedIds.includes(t.id)){
        setDragOverTask({taskId:null,position:"after"});
        setOverDate(null);
        return;
      }
      onReorder(selectedIds,t.id,position,ds);
      setSelected(new Set());
    } else {
      if(draggedId===t.id){
        setDragOverTask({taskId:null,position:"after"});
        setOverDate(null);
        return;
      }
      onReorder(draggedId,t.id,position,ds);
    }
    setOverDate(null);
    setDragOverTask({taskId:null,position:"after"});
    setDraggingId(null);
    dragTask.current=null;
  };
  const handleChipClick=(e,t)=>{
    e.stopPropagation();
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      setSelected(prev=>{ const next=new Set(prev); next.has(t.id)?next.delete(t.id):next.add(t.id); return next; });
    } else {
      if(!draggingId) onEdit(t);
    }
  };
  const applyMultiselect=()=>{
    if(!addDate && !overDate) return;
    if(!selected.size) return;
    const ds = overDate || dateToStr(weekDates[0]);
    onRescheduleMany([...selected],ds);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="week-nav">
        <button className="week-nav-btn" onClick={()=>setOffset(o=>o-1)}>← שבוע קודם</button>
        <button className="week-nav-btn" onClick={()=>setOffset(0)}>היום</button>
        <button className="week-nav-btn" onClick={()=>setOffset(o=>o+1)}>שבוע הבא →</button>
        <h3>{weekLabel}</h3>
      </div>
      <div className="week-grid">
        {weekDates.map(date=>{
          const ds=dateToStr(date);
          const isToday=ds===todayStr;
          const dayTasks=tasks.filter(t=>t.dueDate===ds).sort((a,b)=>{
            const ao=typeof a.order==='number'?a.order:9999;
            const bo=typeof b.order==='number'?b.order:9999;
            if(ao!==bo) return ao-bo;
            return (a.dueTime||"")>(b.dueTime||"")?1:-1;
          });
          const visible=dayTasks;
          return (
            <div key={ds}
              className={"week-cell"+(isToday?" today-col":"")+(overDate===ds?" drag-over":"")+(addDate===ds?" add-active":"")}
              onClick={e=>handleCellClick(e,ds,{draggingId,selectedSize:selected.size})}
              onDragOver={e=>{e.preventDefault(); setOverDate(ds);}}
              onDragLeave={()=>setOverDate(null)}
              onDrop={e=>handleDrop(e,ds)}>
              <div className={"week-header"+(isToday?" today-col":"")} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,marginBottom:4}}>
                <div className={"week-day-head"+(isToday?" today-col":"")} style={{borderRight:"none",width:"100%",padding:4,fontSize:12}}>{DAYS_HE[date.getDay()]}</div>
                <div className={"week-time-label"+(isToday?" today-col":"")}>{date.getDate()} {MONTHS_HE[date.getMonth()]}</div>
              </div>
              {visible.map(t=>{
                const leaveType=leavingTasks[t.id];
                const isTarget = dragOverTask.taskId===t.id;
                const dropClass = isTarget ? (dragOverTask.position==="before" ? " drop-before" : " drop-after") : "";
                return (
                  <div key={t.id}
                    className={"week-chip"+(draggingId===t.id?" dragging":"")+(selected.has(t.id)?" selected":"")+(leaveType?` leaving-${leaveType}`:"") + dropClass}
                    title={`${t.dueTime?fmtTime(t.dueTime)+" ":""}${t.title}`}
                    draggable
                    style={{background:PRIORITIES[t.priority].bg,color:PRIORITIES[t.priority].color,borderRightColor:getProjColor(t.projectId),opacity:t.done?0.5:1,cursor:selected.size>0?"pointer":"grab"}}
                    onDragStart={e=>handleDragStart(e,t)}
                    onDragOver={e=>handleChipDragOver(e,t,ds)}
                    onDragEnter={e=>handleChipDragOver(e,t,ds)}
                    onDragLeave={handleChipLeave}
                    onDrop={e=>handleChipDrop(e,t,ds)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={e=>handleTouchStart(e,t)}
                    onTouchEnd={handleTouchEnd}
                    onClick={e=>handleChipClick(e,t)}>
                    {selected.has(t.id)&&<span style={{marginLeft:4,fontWeight:700}}>✓ </span>}
                    {t.dueTime?`${fmtTime(t.dueTime)} `:""}{t.title}
                  </div>
                );
              })}
              {renderQuickAdd(ds)}
              {showHint(ds,dayTasks.length>0)}
            </div>
          );
        })}
      </div>
      {selected.size>0&&(
        <div className="multiselect-bar">
          <span className="ms-count">✓ {selected.size} משימות נבחרות</span>
          <input type="date" value={overDate||""} onChange={e=>setOverDate(e.target.value)} title="בחר תאריך יעד"/>
          <button className="ms-btn ms-apply" onClick={applyMultiselect} disabled={!overDate}>העבר</button>
          <button className="ms-btn ms-cancel" onClick={()=>setSelected(new Set())}>ביטול</button>
        </div>
      )}
    </div>
  );
}

function ListView({tasks,doneTasks,showDone,setShowDone,filter,setFilter,sort,setSort,onEdit,onToggle,onPin,onDelete,getProjColor,getProjName,collapsedGroups,toggleGroup,projects,leavingTasks,onGlobalDragStart,onGlobalDragEnd}){
  const grouped = tasks.reduce((groups,t)=>{
    const key=t.projectId||"__no_project__";
    if(!groups[key]) groups[key]=[];
    groups[key].push(t);
    return groups;
  },{});
  return (
    <div>
      <div className="filter-bar">
        {[['all','הכל'],['active','פתוחות'],['done','הושלמו'],['high','דחוף'],['overdue','באיחור']].map(([k,l])=>(
          <button key={k} className={"filter-btn"+(filter===k?" active":"")} onClick={()=>setFilter(k)}>{l}</button>
        ))}
        <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="priority">מיון: עדיפות</option>
          <option value="due">מיון: תאריך ושעה</option>
          <option value="title">מיון: שם</option>
          <option value="created">מיון: חדש</option>
        </select>
      </div>
      {tasks.length===0&&<div className="empty"><div className="emoji">✨</div><p>אין משימות</p></div>}
      {Object.entries(grouped).map(([projId,projTasks])=>{
        const proj=projects.find(p=>p.id===projId) || {id:projId,name:"ללא פרויקט",color:"#999",emoji:"❔"};
        if(projTasks.length===0) return null;
        const isC=collapsedGroups[projId];
        return (
          <div key={projId} style={{marginBottom:20}}>
            <div className="group-header" onClick={()=>toggleGroup(projId)}>
              <span style={{width:10,height:10,borderRadius:"50%",background:proj.color,display:"inline-block",flexShrink:0}}/>
              <h3>{proj.emoji} {proj.name}</h3>
              <span className="group-count">{projTasks.filter(t=>!t.done).length} פתוחות</span>
              <span className={"group-toggle"+(isC?"":" open")}>▶</span>
            </div>
            {!isC&&projTasks.map(t=><TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} onPin={onPin} onDelete={onDelete} getProjColor={getProjColor} getProjName={getProjName} leavingTasks={leavingTasks} onGlobalDragStart={onGlobalDragStart} onGlobalDragEnd={onGlobalDragEnd}/>)}
          </div>
        );
      })}
      {doneTasks.length>0&&(
        <>
          <div className="done-separator" onClick={()=>setShowDone(p=>!p)}>
            <span>{showDone?"▾":"▸"}</span><span>הושלמו ({doneTasks.length})</span>
          </div>
          {showDone&&doneTasks.map(t=><TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} onPin={onPin} onDelete={onDelete} getProjColor={getProjColor} getProjName={getProjName} leavingTasks={leavingTasks} onGlobalDragStart={onGlobalDragStart} onGlobalDragEnd={onGlobalDragEnd}/>)}
        </>
      )}
    </div>
  );
}

function ProjectView({project,tasks,onEdit,onToggle,onPin,onDelete,getProjColor,leavingTasks,onGlobalDragStart,onGlobalDragEnd,onBack}){
  const projectTasks = tasks.filter(t=>t.projectId===project.id);
  const activeTasks = projectTasks.filter(t=>!t.done);
  const doneTasks = projectTasks.filter(t=>t.done);
  const todayCount = activeTasks.filter(t=>t.dueDate===today()).length;
  const overdueCount = activeTasks.filter(t=>t.dueDate && t.dueDate<today()).length;

  return (
    <div className="project-view">
      <div className="project-view-header">
        <button type="button" className="project-back-btn" onClick={onBack}>← חזור לרשימה</button>
        <div className="project-view-title">
          <div className="project-pill" style={{background:project.color}}>{project.emoji}</div>
          <div>
            <h2>{project.name}</h2>
            <p>{activeTasks.length} פתוחות · {doneTasks.length} הושלמו</p>
          </div>
        </div>
      </div>
      <div className="project-summary">
        <div className="project-summary-card">
          <span>פתוחות</span>
          <strong>{activeTasks.length}</strong>
        </div>
        <div className="project-summary-card">
          <span>היום</span>
          <strong>{todayCount}</strong>
        </div>
        <div className="project-summary-card">
          <span>באיחור</span>
          <strong>{overdueCount}</strong>
        </div>
      </div>
      <div className="project-section">
        <div className="project-section-heading">
          <h3>משימות הפרויקט</h3>
          <span>{projectTasks.length} משימות</span>
        </div>
        {projectTasks.length===0 ? (
          <div className="empty"><div className="emoji">📭</div><p>אין משימות בפרויקט זה.</p></div>
        ) : (
          projectTasks.map(t=><TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} onPin={onPin} onDelete={onDelete} getProjColor={getProjColor} getProjName={()=>project.name} leavingTasks={leavingTasks} onGlobalDragStart={onGlobalDragStart} onGlobalDragEnd={onGlobalDragEnd}/> )
        )}
      </div>
      {doneTasks.length>0 && (
        <div className="project-section">
          <div className="project-section-heading">
            <h3>הושלמו</h3>
            <span>{doneTasks.length}</span>
          </div>
          {doneTasks.map(t=><TaskRow key={t.id} task={t} onEdit={onEdit} onToggle={onToggle} onPin={onPin} onDelete={onDelete} getProjColor={getProjColor} getProjName={()=>project.name} leavingTasks={leavingTasks} onGlobalDragStart={onGlobalDragStart} onGlobalDragEnd={onGlobalDragEnd}/>)}
        </div>
      )}
    </div>
  );
}

function MonthView({tasks,monthDate,setMonthDate,onEdit,onReschedule,onRescheduleMany,onQuickAdd,onReorder,getProjColor,leavingTasks,onGlobalDragStart,onGlobalDragEnd}){
  const {y,m}=monthDate;
  const cells=getMonthDates(y,m);
  const todayStr=today();
  const prev=()=>setMonthDate(d=>d.m===0?{y:d.y-1,m:11}:{y:d.y,m:d.m-1});
  const next=()=>setMonthDate(d=>d.m===11?{y:d.y+1,m:0}:{y:d.y,m:d.m+1});
  const dragTask=useRef(null);
  const longPressTimer=useRef(null);
  const [draggingId,setDraggingId]=useState(null);
  const [overDate,setOverDate]=useState(null);
  const [dragOverTask,setDragOverTask]=useState({taskId:null,position:"after"});
  const [selected,setSelected]=useState(new Set());
  const [msDate,setMsDate]=useState("");
  const [hoveredMore,setHoveredMore]=useState(null);
  const moreHideTimer=useRef(null);
  const {addDate,handleCellClick,renderQuickAdd,showHint}=useDayQuickAdd(onQuickAdd);
  const showMore=(e,items)=>{ clearTimeout(moreHideTimer.current); setHoveredMore({rect:e.currentTarget.getBoundingClientRect(),items}); };
  const hideMore=()=>{ moreHideTimer.current=setTimeout(()=>setHoveredMore(null),180); };
  const cancelHideMore=()=>{ clearTimeout(moreHideTimer.current); };

  const handleDragStart=(e,t)=>{ dragTask.current=t; setDraggingId(t.id); e.dataTransfer.setData("text/plain", JSON.stringify({ids:selected.size>0 ? [...selected] : [t.id]})); e.dataTransfer.effectAllowed="move"; onGlobalDragStart?.(selected.size>0 ? [...selected] : [t.id]); };
  const handleTooltipDragStart=(e,t)=>{ cancelHideMore(); handleDragStart(e,t); };
  const handleDragEnd=()=>{
    const dropped=onGlobalDragEnd?.();
    if(dropped) setSelected(new Set());
    setDraggingId(null); setOverDate(null); setDragOverTask({taskId:null,position:"after"}); dragTask.current=null;
  };
  const handleDrop=(e,ds)=>{
    e.preventDefault();
    if(!dragTask.current){
      setOverDate(null);
      return;
    }
    if(selected.size>0){
      onReorder([...selected],null,"end",ds);
      setSelected(new Set());
    } else if(dragTask.current.dueDate===ds){
      onReorder(dragTask.current.id,null,"end",ds);
    } else if(dragTask.current.dueDate!==ds){
      onReschedule(dragTask.current.id,ds);
    }
    setOverDate(null); setDragOverTask({taskId:null,position:"after"}); setDraggingId(null); dragTask.current=null;
  };
  const handleTouchStart=(e,t)=>{ longPressTimer.current=setTimeout(()=>{ dragTask.current=t; setDraggingId(t.id); },500); };
  const handleTouchEnd=()=>{ clearTimeout(longPressTimer.current); };
  const handleChipDragOver=(e,t,ds)=>{
    e.preventDefault();
    if(!dragTask.current || dragTask.current.id===t.id) return;
    const rect=e.currentTarget.getBoundingClientRect();
    const pos=e.clientY-rect.top < rect.height*0.45 ? "before" : "after";
    if(dragOverTask.taskId!==t.id || dragOverTask.position!==pos) setDragOverTask({taskId:t.id,position:pos});
  };
  const handleChipLeave=()=>{ setDragOverTask({taskId:null,position:"after"}); };
  const handleChipDrop=(e,t,ds)=>{
    e.preventDefault();
    if(!dragTask.current) return;
    const draggedId = dragTask.current.id;
    const position = dragOverTask.taskId===t.id ? dragOverTask.position : "after";
    if(selected.size>0){
      const selectedIds = [...selected];
      if(selectedIds.includes(t.id)){
        setDragOverTask({taskId:null,position:"after"});
        setOverDate(null);
        return;
      }
      onReorder(selectedIds,t.id,position,ds);
      setSelected(new Set());
    } else {
      if(draggedId===t.id){
        setDragOverTask({taskId:null,position:"after"});
        setOverDate(null);
        return;
      }
      onReorder(draggedId,t.id,position,ds);
    }
    setOverDate(null); setDragOverTask({taskId:null,position:"after"}); setDraggingId(null); dragTask.current=null;
  };
  const handleChipClick=(e,t)=>{
    e.stopPropagation();
    if(e.ctrlKey||e.metaKey){
      e.preventDefault();
      setSelected(prev=>{ const n=new Set(prev); n.has(t.id)?n.delete(t.id):n.add(t.id); return n; });
    } else {
      if(!draggingId) onEdit(t);
    }
  };
  const applyMultiselect=()=>{
    if(!msDate) return;
    onRescheduleMany([...selected],msDate);
    setSelected(new Set()); setMsDate("");
  };

  return (
    <div>
      <div className="week-nav">
        <button className="week-nav-btn" onClick={()=>setMonthDate(d=>d.m===0?{y:d.y-1,m:11}:{y:d.y,m:d.m-1})}>→ חודש קודם</button>
        <button className="week-nav-btn" onClick={()=>setMonthDate({y:new Date().getFullYear(),m:new Date().getMonth()})}>היום</button>
        <button className="week-nav-btn" onClick={()=>setMonthDate(d=>d.m===11?{y:d.y+1,m:0}:{y:d.y,m:d.m+1})}>חודש הבא ←</button>
        <h3 style={{fontSize:16,fontWeight:700}}>{MONTHS_HE[m]} {y}</h3>
        {selected.size>0&&<span style={{fontSize:12,color:"var(--accent)",fontWeight:600,marginRight:8}}>✓ {selected.size} נבחרו — גרור לתא יעד או בחר תאריך בתחתית</span>}
      </div>
      <div className="month-grid-header">
        {DAYS_HE.map(d=><div key={d} className="month-day-head">{d}</div>)}
      </div>
      <div className="month-grid-body">
        {cells.map((cell,i)=>{
          const ds=dateToStr(cell);
          const isOther=cell.getMonth()!==m, isToday=ds===todayStr;
          const dayTasks=tasks.filter(t=>t.dueDate===ds).sort((a,b)=>{
            const ao=typeof a.order==='number'?a.order:9999;
            const bo=typeof b.order==='number'?b.order:9999;
            if(ao!==bo) return ao-bo;
            return (a.dueTime||"")>(b.dueTime||"")?1:-1;
          });
          const show=dayTasks.slice(0,3);
          const more=dayTasks.length-show.length;
          return (
            <div key={i}
              className={"month-cell"+(isOther?" other-month":"")+(isToday?" today-cell":"")+(overDate===ds?" drag-over":"")+(addDate===ds?" add-active":"")}
              onClick={e=>handleCellClick(e,ds,{draggingId,selectedSize:selected.size})}
              onDragOver={e=>{e.preventDefault();setOverDate(ds);}}
              onDragLeave={()=>setOverDate(null)}
              onDrop={e=>handleDrop(e,ds)}>
              <div className="day-num">{cell.getDate()}</div>
              {show.map(t=>{
                const leaveType=leavingTasks[t.id];
                const isTarget = dragOverTask.taskId===t.id;
                const dropClass = isTarget ? (dragOverTask.position==="before" ? " drop-before" : " drop-after") : "";
                return (
                <div key={t.id}
                  className={"month-chip"+(draggingId===t.id?" dragging":"")+(selected.has(t.id)?" selected":"")+(leaveType?` leaving-${leaveType}`:"") + dropClass}
                  title={`${t.dueTime?fmtTime(t.dueTime)+" ":""}${t.title}`}
                  draggable
                  style={{background:PRIORITIES[t.priority].bg,color:PRIORITIES[t.priority].color,borderRightColor:getProjColor(t.projectId),opacity:t.done?0.5:1,cursor:selected.size>0?"pointer":"grab"}}
                  onDragStart={e=>handleDragStart(e,t)}
                  onDragOver={e=>handleChipDragOver(e,t,ds)}
                  onDragEnter={e=>handleChipDragOver(e,t,ds)}
                  onDragLeave={handleChipLeave}
                  onDrop={e=>handleChipDrop(e,t,ds)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={e=>handleTouchStart(e,t)}
                  onTouchEnd={handleTouchEnd}
                  onClick={e=>handleChipClick(e,t)}>
                  {selected.has(t.id)&&<span style={{marginLeft:4,fontWeight:700}}>✓ </span>}
                  {t.dueTime?`${fmtTime(t.dueTime)} `:""}{t.done?"✓ ":""}{t.title}
                </div>
                );
              })}
              {more>0&&<div className="more-chip" onMouseEnter={e=>showMore(e,dayTasks.slice(3))} onMouseLeave={hideMore}>{`+${more} נוספות`}</div>}
              {renderQuickAdd(ds)}
              {showHint(ds,dayTasks.length>0)}
            </div>
          );
        })}
      </div>
      {hoveredMore&&(
        <div className="more-tooltip" style={{top:hoveredMore.rect.bottom + 2,left:Math.min(hoveredMore.rect.left,window.innerWidth - 300)}} onMouseEnter={cancelHideMore} onMouseLeave={hideMore}>
          {hoveredMore.items.map((t,i)=>(
            <div key={t.id||i}
              className={"more-tooltip-item"+(draggingId===t.id?" dragging":"")}
              draggable
              onDragStart={e=>handleTooltipDragStart(e,t)}
              onDragEnd={handleDragEnd}
              onClick={()=>{ cancelHideMore(); setHoveredMore(null); onEdit(t); }}>
              {t.dueTime?fmtTime(t.dueTime)+" ":""}{t.title}
            </div>
          ))}
        </div>
      )}
      {selected.size>0&&(
        <div className="multiselect-bar">
          <span className="ms-count">✓ {selected.size} משימות נבחרות</span>
          <input type="date" value={msDate} onChange={e=>setMsDate(e.target.value)} title="בחר תאריך יעד"/>
          <button className="ms-btn ms-apply" onClick={applyMultiselect} disabled={!msDate}>העבר</button>
          <button className="ms-btn ms-cancel" onClick={()=>setSelected(new Set())}>ביטול</button>
        </div>
      )}
    </div>
  );
}

function Snackbar({toast}){
  if(!toast) return null;
  const isError=toast.type==="error";
  return (
    <div className="snackbar" role="status" aria-live="polite">
      <span className={"snackbar-icon "+(isError?"error":"success")}>{isError?"✕":"✓"}</span>
      <span className="snackbar-text">{toast.message}</span>
    </div>
  );
}

function NotifRing({task,onClose,onSnooze}){
  return (
    <div className="notif-ring">
      <div style={{flex:1}}>
        <div className="nr-title">⏰ {task.title}</div>
        <div className="nr-sub">תזכורת למשימה</div>
        <div className="snooze-bar">
          <span style={{fontSize:11,color:"var(--text3)",alignSelf:"center"}}>Snooze:</span>
          {SNOOZE_OPTIONS.map(opt=><button key={opt.label} className="snooze-btn" onClick={()=>onSnooze(task,opt)}>{opt.label}</button>)}
        </div>
      </div>
      <span className="nr-close" onClick={onClose}>✕</span>
    </div>
  );
}

function HeroView({newTask,setNewTask,addTask,projects}){
  const [openChips,setOpenChips]=useState(false);
  useEffect(()=>{
    if(!openChips) return;
    const close=e=>{ if(!e.target.closest('.hero-card')) setOpenChips(false); };
    document.addEventListener('mousedown',close);
    return ()=>document.removeEventListener('mousedown',close);
  },[openChips]);
  const updateTask=(key,value)=>setNewTask(p=>({...p,[key]:value}));
  const selectRecur=type=>{
    if(type==="custom"){
      setNewTask(p=>({
        ...p,
        recur:{
          ...p.recur,
          type:"custom",
          unit:p.recur?.unit||"week",
          interval:p.recur?.interval||1,
          days:p.recur?.days?.length?p.recur.days:[new Date().getDay()]
        }
      }));
      return;
    }
    setNewTask(p=>({ ...p, recur:{...p.recur,type}}));
  };
  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="hero-title">במה נתחיל היום?</div>
        <div className="hero-card">
          <div className="hero-left">
            <button type="button" className="hero-mic" onClick={()=>setOpenChips(o=>!o)} aria-expanded={openChips} aria-label="פתח תפריט בחירה">
              <span className="hero-mic-icon" aria-hidden="true">🎯</span>
            </button>
          </div>
          <input className="hero-input" placeholder="מה המשימה החדשה?" value={newTask.title} onChange={e=>updateTask("title",e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} dir="rtl" />
          <div className="hero-right">
            <div className="hero-plus" onClick={addTask}>＋</div>
          </div>
          {openChips&&(
            <div className="hero-chip-panel">
              <div className="hero-chip-row">
                <span className="hero-chip-label">עדיפות:</span>
                {Object.entries(PRIORITIES).map(([k,v])=>(
                  <button key={k} type="button" className={"hero-chip"+(newTask.priority===k?" selected":"")} style={newTask.priority===k?{background:v.bg,color:v.color}:undefined} onClick={()=>updateTask("priority",k)}>{v.label}</button>
                ))}
              </div>
              <div className="hero-chip-row">
                <span className="hero-chip-label">פרויקט:</span>
                {(projects||[]).map(p=>(
                  <button key={p.id} type="button" className={"hero-chip"+(newTask.projectId===p.id?" selected":"")} style={newTask.projectId===p.id?{borderColor:p.color}:undefined} onClick={()=>updateTask("projectId",p.id)}>{p.emoji} {p.name}</button>
                ))}
              </div>
              <div className="hero-chip-row hero-chip-row--wrap">
                <span className="hero-chip-label">תאריך ושעה:</span>
                <input type="date" className="hero-chip-date" value={newTask.dueDate||""} onChange={e=>updateTask("dueDate",e.target.value)} />
                <TimeInput24 className="hero-chip-time" selectClassName="hero-chip-time-btn" value={newTask.dueTime||""} onChange={v=>updateTask("dueTime",v)} title="שעת יעד" />
              </div>
              <div className="hero-chip-row">
                <span className="hero-chip-label">חזרה:</span>
                {RECUR_OPTIONS.map(o=>(
                  <button key={o.key} type="button" className={"hero-chip"+(newTask.recur?.type===o.key?" selected":"")} onClick={()=>selectRecur(o.key)}>{o.icon?o.icon+" ":""}{o.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
