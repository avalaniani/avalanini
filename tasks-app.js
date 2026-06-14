const { useState, useEffect, useLayoutEffect, useRef } = React;

function App(){
  const [tasks,setTasks]=useState(()=>{ 
    try{
      const s=localStorage.getItem("tm_tasks"); 
      const data=s?JSON.parse(s):DEF_TASKS;
      return data.map((t,i)=>({
        ...t,
        deleted: t.deleted??false,
        deletedAt: t.deletedAt??null,
        deletedReason: t.deletedReason??null,
        order: typeof t.order==='number' ? t.order : i
      }));
    }catch{return DEF_TASKS.map((t,i)=>({
      ...t,
      order:i
    }));}
  });
  const [projects,setProjects]=useState(()=>{ try{const s=localStorage.getItem("tm_projects"); return s?JSON.parse(s):DEF_PROJECTS;}catch{return DEF_PROJECTS;} });
  const [view,setView]=useState("home");
  const [sidebar,setSidebar]=useState("all");
  const [currentProjectId,setCurrentProjectId]=useState(null);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const [sort,setSort]=useState("priority");
  const [editTask,setEditTask]=useState(null);
  const [newTask,setNewTask]=useState({title:"",priority:"medium",projectId:"p1",dueDate:"",dueTime:"",recur:{type:"none"}});
  const [weekOffset,setWeekOffset]=useState(0);
  const [monthDate,setMonthDate]=useState({y:new Date().getFullYear(),m:new Date().getMonth()});
  const [collapsed,setCollapsed]=useState({});
  const [showDone,setShowDone]=useState(false);
  const [showProjModal,setShowProjModal]=useState(false);
  const [editProject,setEditProject]=useState(null);
  const [leavingTasks,setLeavingTasks]=useState({});
  const [draggingIds,setDraggingIds]=useState([]);
  const externalDropRef=useRef(false);
  const [overHistory,setOverHistory]=useState(false);
  const [overProjectId,setOverProjectId]=useState(null);
  const [notif,clearNotif]=useReminders(tasks);
  const inputRef=useRef();

  const [toast,setToast]=useState(null);
  const toastTimerRef=useRef(null);
  const importRef=useRef();
  const excelImportRef=useRef();

  const exportData=()=>{
    const data={version:1,exportedAt:new Date().toISOString(),tasks,projects};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const dateStr=new Date().toLocaleDateString("he-IL").replace(/\//g,"-");
    a.href=url; a.download=`מטלות-גיבוי-${dateStr}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("✅ הנתונים הורדו בהצלחה!");
  };

  const importData=e=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.tasks||!data.projects) throw new Error("פורמט לא תקין");
        if(!window.confirm(`ייבוא יחליף את כל הנתונים הקיימים.\n${data.tasks.length} משימות, ${data.projects.length} פרויקטים.\nלהמשיך?`)) return;
        setTasks(data.tasks);
        setProjects(data.projects);
        showToast(`✅ יובאו ${data.tasks.length} משימות ו-${data.projects.length} פרויקטים`);
      }catch(err){
        showToast("❌ שגיאה בקובץ – בדוק שזהו קובץ גיבוי תקין");
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };

  const exportExcel = () => {
    try{
      const dateStr=new Date().toLocaleDateString("he-IL").replace(/\//g,"-");
      const headerTasks = ['מזהה','כותרת','עדיפות','פרויקט','בוצע','תאריך יעד','שעת יעד','תזכורת','הערות','משימות משנה','נוצר ב','נעוץ','מוחק','תאריך מחיקה','סיבת מחיקה','חזרה'];
      const projHeader = ['מזהה','שם','צבע','אייקון'];
      const aoa = [];
      aoa.push(headerTasks);
      tasks.forEach(t=>{
        aoa.push([
          t.id,
          t.title,
          t.priority,
          projects.find(p=>p.id===t.projectId)?.name||t.projectId||"",
          t.done,
          t.dueDate,
          t.dueTime,
          t.reminder,
          t.notes,
          JSON.stringify(t.subtasks||[]),
          t.createdAt,
          t.pinned,
          t.deleted,
          t.deletedAt,
          t.deletedReason,
          JSON.stringify(t.recur||{type:'none'})
        ]);
      });
      aoa.push([]);
      aoa.push(['פרויקטים']);
      aoa.push(projHeader);
      projects.forEach(p=>aoa.push([p.id,p.name,p.color,p.emoji]));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{wpx:90},{wpx:300},{wpx:90},{wpx:140},{wpx:60},{wpx:110},{wpx:80},{wpx:140},{wpx:220},{wpx:180},{wpx:160},{wpx:60},{wpx:60},{wpx:140},{wpx:120},{wpx:160}];
      headerTasks.forEach((h,i)=>{
        const cellAddr = XLSX.utils.encode_cell({c:i,r:0});
        if(ws[cellAddr]) ws[cellAddr].s = {font:{bold:true}, alignment:{horizontal:'right'}};
      });
      const projHeaderRowIndex = tasks.length + 2;
      projHeader.forEach((h,i)=>{
        const cellAddr = XLSX.utils.encode_cell({c:i,r:projHeaderRowIndex});
        if(ws[cellAddr]) ws[cellAddr].s = {font:{bold:true}, alignment:{horizontal:'right'}};
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const wbout = XLSX.write(wb,{bookType:'xlsx',type:'array'});
      const blob = new Blob([wbout],{type:'application/octet-stream'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`מטלות-גיבוי-${dateStr}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      showToast('✅ ייצוא אקסל הושלם!');
    }catch(err){
      console.error(err); showToast('❌ שגיאה ביצירת קובץ האקסל');
    }
  };

  const importExcel = e => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload = ev => {
      try{
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, {type:'array'});
        const sheet = wb.Sheets['Sheet1'] || wb.Sheets['משימות'] || wb.Sheets[wb.SheetNames[0]];
        const rows = sheet ? XLSX.utils.sheet_to_json(sheet, {header:1, defval:null}) : [];
        if(!rows.length) {
          if(!window.confirm('לא נמצאו נתונים בגליון. האם לנסות לייבא בכל זאת?')) return;
        }
        const tasksHeaderIndex = rows.findIndex(r=>Array.isArray(r) && r[0]==='מזהה' && r[1]==='כותרת');
        const projHeaderIndex  = rows.findIndex(r=>Array.isArray(r) && r[0]==='מזהה' && r[1]==='שם');
        let tRows = [];
        let pRows = [];
        if(tasksHeaderIndex>=0){
          const start = tasksHeaderIndex+1;
          const end = projHeaderIndex>0 ? projHeaderIndex-1 : rows.length-1;
          for(let i=start;i<=end;i++){
            const r = rows[i]; if(!r||r.length===0) continue;
            tRows.push(r);
          }
        }
        if(projHeaderIndex>=0){
          const start = projHeaderIndex+1;
          for(let i=start;i<rows.length;i++){ const r=rows[i]; if(!r||r.length===0) continue; pRows.push(r); }
        }
        if(tRows.length===0 && (wb.Sheets['משימות'] || wb.Sheets['tasks'])){
          const sheetTasks = wb.Sheets['משימות'] || wb.Sheets['tasks'];
          const tArr = sheetTasks ? XLSX.utils.sheet_to_json(sheetTasks,{defval:null}) : [];
          tRows = tArr.map(o=>[o['מזהה']||o.id, o['כותרת']||o.title, o['עדיפות']||o.priority, o['פרויקט']||o.project||o.projectId, o['בוצע']||o.done, o['תאריך יעד']||o.dueDate, o['שעת יעד']||o.dueTime, o['תזכורת']||o.reminder, o['הערות']||o.notes, o['משימות משנה']||o.subtasks, o['נוצר ב']||o.createdAt, o['נעוץ']||o.pinned, o['מוחק']||o.deleted, o['תאריך מחיקה']||o.deletedAt, o['סיבת מחיקה']||o.deletedReason, o['חזרה']||o.recur]);
        }
        if(pRows.length===0 && (wb.Sheets['פרויקטים'] || wb.Sheets['projects'])){
          const sheetProj = wb.Sheets['פרויקטים'] || wb.Sheets['projects'];
          const pArr = sheetProj ? XLSX.utils.sheet_to_json(sheetProj,{defval:null}) : [];
          pRows = pArr.map(o=>[o['מזהה']||o.id, o['שם']||o.name, o['צבע']||o.color, o['אייקון']||o.emoji]);
        }

        if(!window.confirm(`ייבוא יחליף את כל הנתונים הקיימים.\n${tRows.length} משימות, ${pRows.length} פרויקטים.\nלהמשיך?`)) return;

        const normProj = pRows.map(r=>({ id:String(r[0]||uid()), name:String(r[1]||""), color:String(r[2]||PROJ_COLORS[0]), emoji:String(r[3]||'📌') }));
        const projByName = Object.fromEntries(normProj.map(p=>[p.name,p.id]));

        const normTasks = tRows.map(r=>{
          const id = String(r[0]||uid());
          const title = String(r[1]||"");
          const priority = String(r[2]||"medium");
          const projectRef = r[3]||"";
          const projectId = projByName[projectRef] || String(projectRef||r[3]||uid());
          const done = (r[4]===true||String(r[4]).toLowerCase()==='true')||false;
          const dueDate = r[5]||null;
          const dueTime = r[6]||"";
          const reminder = r[7]||null;
          const notes = r[8]||"";
          const subtasksRaw = r[9]||"";
          let subtasks=[];
          if(typeof subtasksRaw==='string'){
            try{ subtasks = JSON.parse(subtasksRaw); }catch(e){ subtasks = subtasksRaw.split(/\n|;/).map(s=>s.trim()).filter(Boolean).map(s=>({id:uid(),title:s,done:false})); }
          } else if(Array.isArray(subtasksRaw)) subtasks=subtasksRaw;
          const createdAt = r[10]||new Date().toISOString();
          const pinned = (r[11]===true||String(r[11]).toLowerCase()==='true')||false;
          const deleted = (r[12]===true||String(r[12]).toLowerCase()==='true')||false;
          const deletedAt = r[13]||null;
          const deletedReason = r[14]||null;
          const recurRaw = r[15]||null;
          let recur={type:'none'};
          if(typeof recurRaw==='string') try{ recur=JSON.parse(recurRaw); }catch(e){ recur={type:'none'}; }
          else if(typeof recurRaw==='object'&&recurRaw) recur=recurRaw;
          return { id, title, priority, projectId, done, dueDate, dueTime, reminder, snoozedUntil:null, notes, subtasks, createdAt, pinned, deleted, deletedAt, deletedReason, recur };
        });

        setTasks(normTasks);
        setProjects(normProj.length?normProj:DEF_PROJECTS);
        showToast(`✅ יובאו ${normTasks.length} משימות ו-${normProj.length} פרויקטים`);
      }catch(err){ console.error(err); showToast('❌ שגיאה בקובץ אקסל — פורמט לא תקין'); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value="";
  };

  const showToast=(msg,type)=>{
    let message=msg, toastType=type||"success";
    if(typeof msg==="string"){
      if(msg.startsWith("✅")){ toastType="success"; message=msg.slice(2).trim(); }
      else if(msg.startsWith("❌")){ toastType="error"; message=msg.slice(2).trim(); }
    }
    if(toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({type:toastType,message});
    toastTimerRef.current=setTimeout(()=>{ setToast(null); toastTimerRef.current=null; },3200);
  };

  useEffect(()=>{ try{localStorage.setItem("tm_tasks",JSON.stringify(tasks));}catch{} },[tasks]);
  useEffect(()=>{ try{localStorage.setItem("tm_projects",JSON.stringify(projects));}catch{} },[projects]);

  const addTask=()=>{
    if(!newTask.title.trim()) return;
    const dueDate = newTask.dueDate||today();
    const order = getNextOrderForDate(dueDate,tasks);
    const t={id:uid(),title:newTask.title.trim(),priority:newTask.priority,projectId:newTask.projectId||projects[0]?.id,done:false,dueDate, dueTime:newTask.dueTime||"",reminder:null,snoozedUntil:null,notes:"",subtasks:[],createdAt:new Date().toISOString(),pinned:false,recur:newTask.recur||{type:"none"},deleted:false,deletedAt:null,deletedReason:null,order};
    setTasks(p=>[t,...p]);
    setNewTask({title:"",priority:"medium",projectId:newTask.projectId,dueDate:"",dueTime:"",recur:{type:"none"}});
    inputRef.current?.focus();
  };
  const quickAddTask=(date,title)=>{
    if(!title.trim()) return;
    const order = getNextOrderForDate(date,tasks);
    const t={id:uid(),title:title.trim(),priority:newTask.priority,projectId:newTask.projectId||projects[0]?.id,done:false,dueDate:date,dueTime:"",reminder:null,snoozedUntil:null,notes:"",subtasks:[],createdAt:new Date().toISOString(),pinned:false,recur:{type:"none"},deleted:false,deletedAt:null,deletedReason:null,order};
    setTasks(p=>[t,...p]);
  };
  const toggleNewTaskDay=day=>setNewTask(p=>{
    const days=p.recur?.days||[];
    const next=days.includes(day)?days.filter(d=>d!==day):[...days,day];
    return { ...p, recur:{...p.recur,type:"custom",unit:"week",interval:p.recur?.interval||1,days:next}};
  });
  const toggleDone=id=>{
    const task=tasks.find(t=>t.id===id);
    if(!task) return;
    if(task.done){
      setTasks(p=>p.map(t=>t.id===id?{...t,done:false,deletedReason:null,deletedAt:null}:t));
      return;
    }
    animateTask(id,"completed",()=>{
      setTasks(p=>{
        const taskInside=p.find(t=>t.id===id);
        if(!taskInside) return p;
        const nowDone=true;
        const updated=p.map(t=>t.id===id?{...t,done:nowDone,deletedAt:new Date().toISOString(),deletedReason:"completed"}:t);
        if(taskInside.recur&&taskInside.recur.type!=="none"){
          const nd=nextDueDate(taskInside.dueDate,taskInside.recur);
          if(nd){
            const next={...taskInside,id:uid(),done:false,dueDate:nd,createdAt:new Date().toISOString(),subtasks:(taskInside.subtasks||[]).map(s=>({...s,done:false})),deleted:false,deletedAt:null,deletedReason:null};
            return [next,...updated];
          }
        }
        return updated;
      });
    });
  };
  const togglePin =id=>setTasks(p=>p.map(t=>t.id===id?{...t,pinned:!t.pinned}:t));
  const deleteTask=id=>{
    animateTask(id,"deleted",()=>{
      setTasks(p=>p.map(t=>t.id===id?{...t,done:false,deleted:true,deletedAt:new Date().toISOString(),deletedReason:"deleted"}:t));
      setEditTask(null);
    });
  };
  const restoreTask=id=>{setTasks(p=>p.map(t=>t.id===id?{...t,done:false,deleted:false,deletedAt:null,deletedReason:null}:t));};
  const getNextOrderForDate=(date,list)=>{
    const existing = list.filter(t=>t.dueDate===date).map(t=>typeof t.order==='number'?t.order:0);
    return existing.length ? Math.max(...existing)+1 : 0;
  };
  const rescheduleTask=(id,newDate)=>{setTasks(p=>{
    const nextOrder = getNextOrderForDate(newDate,p);
    return p.map(t=>t.id===id?{...t,dueDate:newDate,order:nextOrder}:t);
  });};
  const rescheduleManyTasks=(ids,newDate)=>{setTasks(p=>{
    let nextOrder = getNextOrderForDate(newDate,p);
    return p.map(t=>ids.includes(t.id)?{...t,dueDate:newDate,order:nextOrder++}:t);
  });};
  const reorderTasksInDate=(draggedIds,targetId,position,date)=>{
    const ids = Array.isArray(draggedIds)?draggedIds:[draggedIds];
    setTasks(p=>{
      const draggedTasks = p.filter(t=>ids.includes(t.id)).sort((a,b)=>{
        if(a.dueDate!==b.dueDate) return a.dueDate<b.dueDate?-1:1;
        const ao=typeof a.order==='number'?a.order:9999;
        const bo=typeof b.order==='number'?b.order:9999;
        if(ao!==bo) return ao-bo;
        return (a.dueTime||"9999")>(b.dueTime||"9999")?1:-1;
      });
      if(!draggedTasks.length) return p;
      const dateGroup = p.filter(t=>t.dueDate===date).sort((a,b)=>{
        const ao=typeof a.order==='number'?a.order:9999;
        const bo=typeof b.order==='number'?b.order:9999;
        if(ao!==bo) return ao-bo;
        return (a.dueTime||"9999")>(b.dueTime||"9999")?1:-1;
      });
      const remaining = dateGroup.filter(t=>!ids.includes(t.id));
      let reordered;
      if(!targetId || position==="end"){
        reordered = [...remaining,...draggedTasks];
      } else {
        const targetIndex = remaining.findIndex(t=>t.id===targetId);
        if(targetIndex<0) return p;
        const insertAt = position==="after" ? targetIndex+1 : targetIndex;
        reordered = [...remaining.slice(0,insertAt),...draggedTasks,...remaining.slice(insertAt)];
      }
      const orderMap = Object.fromEntries(reordered.map((t,i)=>[t.id,i]));
      return p.map(t=>{
        if(ids.includes(t.id)) return {...t,dueDate:date,order:orderMap[t.id]};
        if(t.dueDate===date) return {...t,order:orderMap[t.id]};
        return t;
      });
    });};
  const deletePermanent=ids=>{
    const keepIds=Array.isArray(ids)?ids:([ids].filter(Boolean));
    if(!keepIds.length) return;
    setTasks(p=>p.filter(t=>!keepIds.includes(t.id)));
  };
  const saveTask  =upd=>{setTasks(p=>p.map(t=>t.id===upd.id?{...upd,order:upd.dueDate===t.dueDate ? (typeof t.order==='number'?t.order:0) : getNextOrderForDate(upd.dueDate,p)}:t));setEditTask(null);};
  const snoozeTask=(task,opt)=>{
    let until;
    if(opt.special==="tomorrow9am"){const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);until=d.toISOString();}
    else{const d=new Date();d.setMinutes(d.getMinutes()+opt.mins);until=d.toISOString();}
    setTasks(p=>p.map(t=>t.id===task.id?{...t,snoozedUntil:until}:t));
    clearNotif();
  };
  const addProject=proj=>{ setProjects(p=>[...p,proj]); setShowProjModal(false); };
  const updateProject=proj=>{ setProjects(p=>p.map(x=>x.id===proj.id?proj:x)); setEditProject(null); };
  const animateTask=(id,type,callback)=>{
    setLeavingTasks(prev=>({...prev,[id]:type}));
    setTimeout(()=>{
      setLeavingTasks(prev=>{ const next={...prev}; delete next[id]; return next; });
      callback();
    },260);
  };
  const deleteProject=id=>{
    if(!window.confirm("האם למחוק את הפרויקט הזה?\nהמשימות שלו יעברו לפרויקט אחר.")) return;
    const remainingProjects=projects.filter(p=>p.id!==id);
    if(remainingProjects.length===0){
      const fallback={id:uid(),name:"כללי",color:"#8D6E63",emoji:"📌"};
      setProjects([fallback]);
      setTasks(old=>old.map(t=>t.projectId===id?{...t,projectId:fallback.id}:t));
    } else {
      const targetId=remainingProjects[0].id;
      setProjects(remainingProjects);
      setTasks(old=>old.map(t=>t.projectId===id?{...t,projectId:targetId}:t));
    }
    if(sidebar===`p:${id}`) setSidebar("all");
    if(currentProjectId===id){ setCurrentProjectId(null); setView("list"); }
  };

  const parseDragIds=e=>{
    let ids=[];
    try{ const payload=JSON.parse(e.dataTransfer.getData("text/plain")||""); if(Array.isArray(payload.ids)) ids=payload.ids; }
    catch{};
    if(!ids.length){ const raw=e.dataTransfer.getData("text/plain"); if(raw) ids=[raw]; }
    return ids.filter(Boolean);
  };
  const handleDragStartGlobal=(ids)=>{
    externalDropRef.current=false;
    setDraggingIds(ids||[]);
  };
  const handleDragEndGlobal=()=>{
    const dropped=externalDropRef.current;
    externalDropRef.current=false;
    setDraggingIds([]);
    setOverHistory(false);
    setOverProjectId(null);
    return dropped;
  };
  const moveTasksToProject=(ids,projectId)=>{
    const toMove=ids.filter(id=>{
      const t=tasks.find(x=>x.id===id);
      return t&&!t.deleted&&t.projectId!==projectId;
    });
    if(!toMove.length) return;
    setTasks(p=>p.map(t=>toMove.includes(t.id)?{...t,projectId}:t));
    const proj=projects.find(p=>p.id===projectId);
    showToast(`${toMove.length===1?"משימה הועברה":`${toMove.length} משימות הועברו`} ל${proj?.emoji||""} ${proj?.name||"פרויקט"}`);
  };
  const markTasksAsDone=ids=>{
    const toComplete=ids.filter(id=>{
      const t=tasks.find(x=>x.id===id);
      return t&&!t.deleted&&!t.done;
    });
    if(!toComplete.length) return;
    toComplete.forEach(id=>toggleDone(id));
    showToast(`${toComplete.length===1?"משימה הועברה":`${toComplete.length} משימות הועברו`} להסתיימו`);
  };
  const handleHistoryDragOver=e=>{ e.preventDefault(); if(draggingIds.length) setOverHistory(true); };
  const handleHistoryDragLeave=()=>setOverHistory(false);
  const handleHistoryDrop=e=>{
    e.preventDefault();
    const ids=parseDragIds(e);
    if(ids.length){ markTasksAsDone(ids); externalDropRef.current=true; }
    setOverHistory(false);
    setDraggingIds([]);
  };
  const handleProjectDragOver=(e,projectId)=>{ e.preventDefault(); if(draggingIds.length) setOverProjectId(projectId); };
  const handleProjectDragLeave=e=>{ if(!e.currentTarget.contains(e.relatedTarget)) setOverProjectId(null); };
  const handleProjectDrop=(e,projectId)=>{
    e.preventDefault();
    const ids=parseDragIds(e);
    if(ids.length){ moveTasksToProject(ids,projectId); externalDropRef.current=true; }
    setOverProjectId(null);
    setDraggingIds([]);
  };

  const getProjColor=id=>projects.find(p=>p.id===id)?.color||"#999";
  const getProjName =id=>projects.find(p=>p.id===id)?.name||"לא שויכה";
  const currentProject = projects.find(p=>p.id===currentProjectId) || null;

  const allFiltered=tasks.filter(t=>{
    if(t.deleted) return false;
    if(search&&!t.title.includes(search)&&!t.notes?.includes(search)) return false;
    if(sidebar!=="all"){
      if(sidebar.startsWith("p:")&&t.projectId!==sidebar.slice(2)) return false;
      if(sidebar==="today"&&t.dueDate!==today()) return false;
      if(sidebar==="pinned"&&!t.pinned) return false;
    }
    if(filter==="done"&&!t.done) return false;
    if(filter==="active"&&t.done) return false;
    if(filter==="high"&&t.priority!=="high") return false;
    if(filter==="overdue"){const d=t.dueDate?new Date(t.dueDate):null;if(!d||d>=new Date(today())||t.done) return false;}
    return true;
  });
  const sorted=[...allFiltered].sort((a,b)=>{
    if(a.pinned!==b.pinned) return a.pinned?-1:1;
    if(sort==="priority"){const o={high:0,medium:1,low:2};return o[a.priority]-o[b.priority];}
    if(sort==="due"){const ad=(a.dueDate||"9999")+(a.dueTime||""),bd=(b.dueDate||"9999")+(b.dueTime||"");return ad<bd?-1:1;}
    if(sort==="title") return a.title.localeCompare(b.title,"he");
    return new Date(b.createdAt)-new Date(a.createdAt);
  });
  const activeTasks=sorted.filter(t=>!t.done);
  const doneTasks  =sorted.filter(t=>t.done);
  const todayCount =tasks.filter(t=>!t.done&&t.dueDate===today()&&!t.deleted).length;
  const overdueCount=tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<today()&&!t.deleted).length;
  const totalActive=tasks.filter(t=>!t.done&&!t.deleted).length;
  const completedCount=tasks.filter(t=>t.deletedReason==="completed").length;
  const deletedCount=tasks.filter(t=>t.deletedReason==="deleted").length;

  const WeekIcon = ({active}) => {
    const c=active?"#4F6EF7":"#6B6560";
    const heights=[10,14,8,16,12,6,9];
    const barW=1.7,gap=0.9;
    const totalW=7*barW+6*gap,startX=(18-totalW)/2;
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
        {heights.map((h,i)=>{
          const x=startX+i*(barW+gap),y=16.5-h,isToday=i===3;
          return <rect key={i} x={x} y={y} width={barW} height={h} rx="0.8"
            fill={isToday?c:(active?"#C5CFFB":"#C8C2BC")} opacity={isToday?1:0.75}/>;
        })}
        <line x1="1.5" y1="16.8" x2="16.5" y2="16.8" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    );
  };
  const MonthIcon = ({active}) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <rect x="1.5" y="3" width="15" height="13.5" rx="2.5" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.5" fill={active?"#EEF1FE":"none"}/>
      <line x1="1.5" y1="7" x2="16.5" y2="7" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.5"/>
      <line x1="5" y1="1.5" x2="5" y2="4.5" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="13" y1="1.5" x2="13" y2="4.5" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="5" cy="10.5" r="1" fill={active?"#4F6EF7":"#A09890"}/>
      <circle cx="9" cy="10.5" r="1" fill={active?"#4F6EF7":"#A09890"}/>
      <circle cx="13" cy="10.5" r="1" fill={active?"#4F6EF7":"#A09890"}/>
      <circle cx="5" cy="14" r="1" fill={active?"#4F6EF7":"#A09890"}/>
      <circle cx="9" cy="14" r="1" fill={active?"#4F6EF7":"#A09890"}/>
      <circle cx="13" cy="14" r="1" fill={active?"#4F6EF7":"#A09890"}/>
    </svg>
  );
  const DoneIcon = ({active}) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <circle cx="9" cy="9" r="7.5" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.5" fill={active?"#EEF1FE":"none"}/>
      <path d="M5.5 9.2L7.8 11.5L12.5 6.5" stroke={active?"#4F6EF7":"#6B6560"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const SettingsIcon = ({active}) => {
    const c=active?"#4F6EF7":"#6B6560";
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
        <circle cx="9" cy="9" r="2.2" stroke={c} strokeWidth="1.4"/>
        <path d="M9 1.5V3M9 15v1.5M1.5 9H3M15 9h1.5M3.4 3.4l1.06 1.06M13.54 13.54l1.06 1.06M14.6 3.4l-1.06 1.06M4.46 13.54l-1.06 1.06"
          stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    );
  };
  const VIEWS=[
    {key:"home",    icon:"✦",          label:"התחלה"},
    {key:"today",   icon:"☀",          label:"יום"},
    {key:"week",    icon:"WEEK_SVG",   label:"שבוע"},
    {key:"month",   icon:"MONTH_SVG",  label:"חודש"},
    {key:"history", icon:"DONE_SVG",   label:"הסתיימו"},
    {key:"list",    icon:"☰",          label:"רשימה"},
    {key:"settings",icon:"SETTINGS_SVG",label:"הגדרות"},
  ];
  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-logo"><span>✅</span> מטלות</div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">תצוגות</div>
          {VIEWS.map(v=>{
            const isActive=view===v.key;
            let iconEl;
            if(v.icon==="WEEK_SVG") iconEl=<WeekIcon active={isActive}/>;
            else if(v.icon==="MONTH_SVG") iconEl=<MonthIcon active={isActive}/>;
            else if(v.icon==="DONE_SVG") iconEl=<DoneIcon active={isActive}/>;
            else if(v.icon==="SETTINGS_SVG") iconEl=<SettingsIcon active={isActive}/>;
            else iconEl=<span className="icon">{v.icon}</span>;
            return (
              <div key={v.key}
                className={"sidebar-item"+(isActive?" active":"")+(v.key==="history"&&overHistory?" drag-over":"")}
                onClick={()=>setView(v.key)}
                onDragOver={v.key==="history"?handleHistoryDragOver:null}
                onDragLeave={v.key==="history"?handleHistoryDragLeave:null}
                onDrop={v.key==="history"?handleHistoryDrop:null}>
                {iconEl}{v.label}
              </div>
            );
          })}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">פרויקטים</div>
          {projects.map(p=>(
            <div key={p.id} className={"sidebar-item"+((sidebar===`p:${p.id}`|| (view==="project"&&currentProjectId===p.id))?" active":"")+(overProjectId===p.id?" drag-over":"")} onClick={()=>{ setSidebar("all"); setCurrentProjectId(p.id); setView("project"); }} onDragOver={e=>handleProjectDragOver(e,p.id)} onDragLeave={handleProjectDragLeave} onDrop={e=>handleProjectDrop(e,p.id)}>
              <span className="project-dot" style={{background:p.color}}/>
              <span style={{flex:1}}>{p.emoji} {p.name}</span>
              <span className="group-count">{tasks.filter(t=>t.projectId===p.id&&!t.done).length}</span>
              <button className="icon-btn" style={{width:26,height:26,marginLeft:8}} title="ערוך פרויקט" onClick={e=>{e.stopPropagation();setEditProject(p);}}>✏️</button>
              <button className="icon-btn del" style={{width:26,height:26,marginLeft:8}} title="מחק פרויקט" onClick={e=>{e.stopPropagation();deleteProject(p.id);}}>🗑</button>
            </div>
          ))}
          <div className="sidebar-add-project" onClick={()=>setShowProjModal(true)}>
            <span>＋</span> פרויקט חדש
          </div>
        </div>
      </nav>

      <div className="main">
        <div className="content">
          {view!=="home"&&view!=="history"&&(
            <div className="quick-add">
            <div className="quick-add-row">
              <input ref={inputRef} className="quick-add-input" placeholder="+ הוסף משימה חדשה... (Enter)" value={newTask.title} onChange={e=>setNewTask(p=>({...p,title:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTask()} dir="rtl"/>
              <input type="date" className="qa-pill" style={{fontFamily:"inherit"}} value={newTask.dueDate||""} onChange={e=>setNewTask(p=>({...p,dueDate:e.target.value}))}/>
              <select className="qa-pill" value={newTask.projectId||""} onChange={e=>setNewTask(p=>({...p,projectId:e.target.value}))}>
                {projects.map(p=><option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
              <select className="qa-pill" value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))} title="רמת דחיפות">
                {Object.entries(PRIORITIES).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <TimeInput24 selectClassName="qa-pill" value={newTask.dueTime||""} onChange={v=>setNewTask(p=>({...p,dueTime:v}))} title="שעת המשימה"/>
              <select className="qa-pill" value={newTask.recur?.type||"none"} onChange={e=>{
                const value=e.target.value;
                setNewTask(p=>({
                  ...p,
                  recur: value==="custom" ? {...p.recur,type:"custom",unit:"week",interval:1,days:p.recur?.days?.length? p.recur.days : [new Date().getDay()]} : {...p.recur,type:value,interval:1,unit:"day"}
                }));
              }} title="חזרה">
                {RECUR_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.icon?o.icon+" ":""}{o.label}</option>)}
              </select>
              <button className="add-btn" onClick={addTask}>הוסף</button>
            </div>
            {newTask.recur?.type==="custom"&&(
              <div className="recur-custom-row" style={{width:"100%",paddingTop:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13,color:"var(--text2)",width:"100%",marginBottom:8}}>בחר ימים לחזרה</span>
                {DAYS_HE.map((day,idx)=>(
                  <button key={day} className={"qa-pill"+(newTask.recur.days?.includes(idx)?" sel":"")} style={{minWidth:68}} onClick={()=>toggleNewTaskDay(idx)}>{day}</button>
                ))}
              </div>
            )}
            </div>
          )}
          {view==="home"&&<HeroView newTask={newTask} setNewTask={setNewTask} addTask={addTask}/>} 
          {view==="list"&&<ListView tasks={activeTasks} doneTasks={doneTasks} showDone={showDone} setShowDone={setShowDone} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} onEdit={setEditTask} onToggle={toggleDone} onPin={togglePin} onDelete={deleteTask} getProjColor={getProjColor} getProjName={getProjName} collapsedGroups={collapsed} toggleGroup={k=>setCollapsed(p=>({...p,[k]:!p[k]}))} projects={projects} leavingTasks={leavingTasks} onGlobalDragStart={handleDragStartGlobal} onGlobalDragEnd={handleDragEndGlobal}/>} 
          {view==="today"&&<TodayView tasks={tasks.filter(t=>!t.deleted)} onEdit={setEditTask} onToggle={toggleDone} onPin={togglePin} onDelete={deleteTask} onReorder={reorderTasksInDate} getProjColor={getProjColor} getProjName={getProjName} projects={projects} leavingTasks={leavingTasks} onGlobalDragStart={handleDragStartGlobal} onGlobalDragEnd={handleDragEndGlobal}/>} 
          {view==="history"&&<HistoryListView tasks={tasks.filter(t=>t.deleted||t.deletedReason==="completed")} getProjColor={getProjColor} getProjName={getProjName} onRestore={restoreTask} onDeletePermanent={deletePermanent} projects={projects}/>} 
          {view==="project"&&currentProject&&<ProjectView project={currentProject} tasks={tasks.filter(t=>!t.deleted)} onEdit={setEditTask} onToggle={toggleDone} onPin={togglePin} onDelete={deleteTask} getProjColor={getProjColor} leavingTasks={leavingTasks} onGlobalDragStart={handleDragStartGlobal} onGlobalDragEnd={handleDragEndGlobal} onBack={()=>{setCurrentProjectId(null); setView("list"); setSidebar("all");}}/>}
          {view==="project"&&!currentProject&&<div className="empty"><div className="emoji">⚠️</div><p>הפרויקט לא נמצא.</p></div>}
          {view==="week"&&<WeekView tasks={tasks.filter(t=>!t.deleted && !t.done)} offset={weekOffset} setOffset={setWeekOffset} onEdit={setEditTask} onReschedule={rescheduleTask} onRescheduleMany={rescheduleManyTasks} onQuickAdd={quickAddTask} onReorder={reorderTasksInDate} getProjColor={getProjColor} leavingTasks={leavingTasks} onGlobalDragStart={handleDragStartGlobal} onGlobalDragEnd={handleDragEndGlobal}/>} 
          {view==="month"&&<MonthView tasks={tasks.filter(t=>!t.deleted && !t.done)} monthDate={monthDate} setMonthDate={setMonthDate} onEdit={setEditTask} onReschedule={rescheduleTask} onRescheduleMany={rescheduleManyTasks} onQuickAdd={quickAddTask} onReorder={reorderTasksInDate} getProjColor={getProjColor} leavingTasks={leavingTasks} onGlobalDragStart={handleDragStartGlobal} onGlobalDragEnd={handleDragEndGlobal}/>} 
          {view==="settings"&&(
            <div style={{maxWidth:760,margin:"20px auto",background:"var(--surface)",padding:20,borderRadius:12,boxShadow:"var(--shadow)"}}>
              <h3 style={{marginBottom:12}}>הגדרות — ייבוא / ייצוא Excel</h3>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="tb-btn" onClick={exportData}>⬇️ ייצוא (JSON)</button>
                <button className="tb-btn" onClick={exportExcel}>⬇️ ייצוא Excel</button>
                <button className="tb-btn import-btn" onClick={()=>importRef.current?.click()}>⬆️ ייבוא (JSON)</button>
                <button className="tb-btn import-btn" onClick={()=>excelImportRef.current?.click()}>⬆️ ייבוא Excel</button>
                <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={importData}/>
                <input ref={excelImportRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importExcel}/>
              </div>
              <p style={{color:"var(--text2)",marginTop:12}}>ייבוא יחליף את כל הנתונים הקיימים. מומלץ לבצע גיבוי קודם.</p>
            </div>
          )}
        </div>
      </div>

      {editTask&&<TaskModal task={editTask} projects={projects} onSave={saveTask} onDelete={deleteTask} onClose={()=>setEditTask(null)}/>} 
      {showProjModal&&<NewProjectModal onSave={addProject} onClose={()=>setShowProjModal(false)}/>} 
      {editProject&&<NewProjectModal project={editProject} onSave={updateProject} onClose={()=>setEditProject(null)}/>} 
      {notif&&<NotifRing task={notif} onClose={clearNotif} onSnooze={snoozeTask}/>} 
      <Snackbar toast={toast}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
