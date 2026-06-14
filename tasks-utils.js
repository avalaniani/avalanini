const uid = () => Math.random().toString(36).slice(2,10);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dateToStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate = s => { const [y,m,day] = s.split("-").map(Number); return new Date(y,m-1,day); };
const offsetDate = (s,delta) => { const d = parseDate(s); d.setDate(d.getDate()+delta); return dateToStr(d); };

const RECUR_OPTIONS = [
  { key:"none",    label:"ללא חזרה" },
  { key:"daily",   label:"כל יום",        icon:"🔁" },
  { key:"weekly",  label:"כל שבוע",       icon:"🗓️" },
  { key:"monthly", label:"כל חודש",       icon:"📅" },
  { key:"yearly",  label:"כל שנה",        icon:"📆" },
  { key:"custom",  label:"בחירה אישית",   icon:"⚙️" },
];

function joinHebrewList(items){
  if(!items||items.length===0) return "";
  if(items.length===1) return items[0];
  return items.slice(0,-1).join(", ") + " ו" + items[items.length-1];
}

function getRecurLabel(recur){
  if(!recur||recur.type===undefined||recur.type===null || recur.type==="none") return null;
  const opt=RECUR_OPTIONS.find(o=>o.key===recur.type);
  if(recur.type==="custom"){
    if(recur.days?.length){
      return `⚙️ ${joinHebrewList(recur.days.map(d=>DAYS_HE[d]))}`;
    }
    return `${opt.icon} כל ${recur.interval} ${recur.unit==="day"?"ימים":recur.unit==="week"?"שבועות":recur.unit==="month"?"חודשים":"שנים"}`;
  }
  return opt?`${opt.icon} ${opt.label}`:null;
}

function nextDueDate(dueDate, recur){
  if(!recur||recur.type===undefined||recur.type===null||recur.type==="none"||!dueDate) return null;
  const d=new Date(dueDate+"T12:00:00");
  if(recur.type==="daily")        d.setDate(d.getDate()+1);
  else if(recur.type==="weekly")  d.setDate(d.getDate()+7);
  else if(recur.type==="monthly") d.setMonth(d.getMonth()+1);
  else if(recur.type==="yearly")  d.setFullYear(d.getFullYear()+1);
  else if(recur.type==="custom"){
    const days = Array.isArray(recur.days)?[...new Set(recur.days.map(x=>Number(x)).filter(n=>!isNaN(n)&&n>=0&&n<7))]:[];
    if(days.length){
      const next = new Date(d);
      next.setDate(next.getDate()+1);
      for(let i=0;i<28;i++){
        if(days.includes(next.getDay())) return next.toISOString().slice(0,10);
        next.setDate(next.getDate()+1);
      }
    }
    const n=parseInt(recur.interval)||1;
    if(recur.unit==="day")        d.setDate(d.getDate()+n);
    else if(recur.unit==="week")  d.setDate(d.getDate()+n*7);
    else if(recur.unit==="month") d.setMonth(d.getMonth()+n);
    else if(recur.unit==="year")  d.setFullYear(d.getFullYear()+n);
  }
  return dateToStr(d);
}

const PRIORITIES = {
  high:   { label:"גבוהה",   color:"#E53935", bg:"#FFEBEE" },
  medium: { label:"בינונית", color:"#F57C00", bg:"#FFF3E0" },
  low:    { label:"נמוכה",   color:"#43A047", bg:"#E8F5E9" },
};
const DAYS_HE   = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const DAYS_SHORT = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const MONTHS_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const PROJ_COLORS = ["#4F6EF7","#E040FB","#E53935","#43A047","#F57C00","#00ACC1","#8D6E63","#546E7A"];
const PROJ_EMOJIS = ["💼","🌿","🔥","🏠","⭐","🎯","📚","💡","🎨","🚀"];
const SNOOZE_OPTIONS = [
  { label:"10 דקות", mins:10 },
  { label:"30 דקות", mins:30 },
  { label:"שעה",     mins:60 },
  { label:"מחר בבוקר", mins:null, special:"tomorrow9am" },
];

function fmtDate(d) {
  if (!d) return "";
  const dt = typeof d==="string" ? new Date(d) : d;
  return `${dt.getDate()} ${MONTHS_HE[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtTime(t) { return t ? t.slice(0,5) : ""; }
const TIMES_15 = Array.from({length:96},(_,i)=>{
  const h=String(Math.floor(i/4)).padStart(2,"0");
  const m=String((i%4)*15).padStart(2,"0");
  return `${h}:${m}`;
});
function normTime(t){
  const parts=(t||"").match(/^(\d{1,2}):(\d{2})$/);
  return parts?`${parts[1].padStart(2,"0")}:${parts[2]}`:"";
}
function parseReminder(val){
  if(!val) return {date:"",time:""};
  const m=String(val).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
  if(m) return {date:m[1],time:normTime(`${m[2]}:${m[3]}`)};
  const d=new Date(val);
  if(isNaN(d)) return {date:"",time:""};
  const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const time=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  return {date,time};
}
function buildReminder(date,time){
  if(!date) return null;
  const t=normTime(time);
  if(!t) return null;
  return `${date}T${t}`;
}
function fmtDateTime(str) {
  if (!str) return "";
  const d = new Date(str);
  return `${d.getDate()} ${MONTHS_HE[d.getMonth()]}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function getWeekDates(offset=0) {
  const d=new Date(), day=d.getDay(), sun=new Date(d);
  sun.setDate(d.getDate()-day+offset*7);
  return Array.from({length:7},(_,i)=>{ const x=new Date(sun); x.setDate(sun.getDate()+i); return x; });
}
function getMonthDates(year,month) {
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  const start=new Date(first); start.setDate(1-first.getDay());
  const cells=[];
  for(let d=new Date(start); d<=last||cells.length%7!==0; d.setDate(d.getDate()+1)) {
    cells.push(new Date(d)); if(cells.length>42) break;
  }
  return cells;
}

const DEF_PROJECTS = [
  {id:"p1",name:"עבודה", color:"#4F6EF7",emoji:"💼"},
  {id:"p2",name:"אישי",  color:"#E040FB",emoji:"🌿"},
  {id:"p3",name:"דחוף",  color:"#E53935",emoji:"🔥"},
];
const t0=today();
const t2=dateToStr(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+2));
const DEF_TASKS = [
  {id:uid(),title:"לסיים את הדוח הרבעוני",priority:"high",  projectId:"p1",done:false,dueDate:t0,dueTime:"09:00",reminder:null,snoozedUntil:null,notes:"לכלול גרפים ונתוני מכירות",subtasks:[{id:uid(),title:"גרפים",done:false},{id:uid(),title:"נתוני מכירות",done:true}],createdAt:new Date().toISOString(),pinned:true,deleted:false,deletedAt:null,deletedReason:null},
  {id:uid(),title:"פגישת צוות שבועית",    priority:"medium",projectId:"p1",done:false,dueDate:t0,dueTime:"11:00",reminder:null,snoozedUntil:null,notes:"",subtasks:[],createdAt:new Date().toISOString(),pinned:false,deleted:false,deletedAt:null,deletedReason:null},
  {id:uid(),title:"לקנות מצרכים",         priority:"low",   projectId:"p2",done:false,dueDate:t0,dueTime:"",    reminder:null,snoozedUntil:null,notes:"חלב, לחם, ירקות",subtasks:[],createdAt:new Date().toISOString(),pinned:false,deleted:false,deletedAt:null,deletedReason:null},
  {id:uid(),title:"לשלם חשבון חשמל",      priority:"high",  projectId:"p2",done:false,dueDate:t0,dueTime:"",    reminder:null,snoozedUntil:null,notes:"",subtasks:[],createdAt:new Date().toISOString(),pinned:false,deleted:false,deletedAt:null,deletedReason:null},
  {id:uid(),title:"להכין תכנית שיווקית",  priority:"medium",projectId:"p1",done:false,dueDate:t2,dueTime:"14:30",reminder:null,snoozedUntil:null,notes:"",subtasks:[],createdAt:new Date().toISOString(),pinned:false,deleted:false,deletedAt:null,deletedReason:null},
];
