import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInWithCustomToken,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,getDocs,query,where,doc,setDoc,writeBatch} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),ac=collection(db,"att");
const SCH="SAJ Academy Hussainabad",$=s=>document.querySelector(s);
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>ymd(new Date()),cmp=(a,b)=>a.localeCompare(b,undefined,{numeric:true}),kn=k=>k.replace("|"," - ");
const NM={P:"Present",A:"Absent",L:"Late",V:"Leave"},COL={P:"ok",A:"no",L:"lt",V:"lv"};
const S={me:null,tab:"",students:[],key:"",date:today(),month:today().slice(0,7),att:{},users:[],ur:"all",uq:"",sq:"",sk:"all",edit:"",pwu:"",cf:"",pend:null,err:""};
let LOGO=null;
fetch("assets/logo.jpg").then(r=>r.blob()).then(b=>{const f=new FileReader();f.onload=()=>LOGO=f.result;f.readAsDataURL(b)}).catch(()=>{});
function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(toast.t);toast.t=setTimeout(()=>t.className="",3500)}
async function api(action,data={}){const h={"Content-Type":"application/json"};if(auth.currentUser)h.Authorization="Bearer "+await auth.currentUser.getIdToken();
 const r=await fetch("/api/rpc",{method:"POST",headers:h,body:JSON.stringify({action,...data})});const j=await r.json().catch(()=>({error:"No response from server"}));if(!r.ok)throw new Error(j.error||"Error");return j}
const run=async f=>{try{await f()}catch(x){toast(x.message,true)}};
/* ---------- data ---------- */
const keys=()=>S.me.role==="admin"?[...new Set(S.students.map(s=>s.key))].sort(cmp):S.me.classes;
const inKey=k=>S.students.filter(s=>s.key===k).sort((a,b)=>(+a.roll||0)-(+b.roll||0)||a.name.localeCompare(b.name));
async function loadStudents(){const m=S.me,c=collection(db,"students");
 const qs=m.role==="admin"?[query(c)]:m.role==="teacher"?m.classes.map(k=>query(c,where("key","==",k))):[query(c,where("gr","==",m.gr))];
 S.students=(await Promise.all(qs.map(getDocs))).flatMap(s=>s.docs.map(d=>d.data()))}
const rd=async qs=>(await Promise.all(qs.map(getDocs))).flatMap(s=>s.docs.map(d=>d.data()));
const attDates=(ds,ks)=>rd(S.me.role==="admin"?[query(ac,where("date","in",ds))]:ks.map(k=>query(ac,where("key","==",k),where("date","in",ds))));
const attKD=(k,d)=>rd([query(ac,where("key","==",k),where("date","==",d))]);
const attMonth=(k,m)=>rd([query(ac,where("key","==",k),where("month","==",m))]);
const tally=rows=>{const r={P:0,A:0,L:0,V:0};rows.forEach(x=>r[x.status]++);return r};
const pct=c=>{const t=c.P+c.A+c.L+c.V;return t?Math.round((c.P+c.L)*100/t):0};
/* ---------- auth ---------- */
onAuthStateChanged(auth,async u=>{if(!u){S.me=null;return render()}
 const c=(await u.getIdTokenResult(true)).claims;S.me={u:u.uid,role:c.role,name:c.name||u.uid,gr:c.gr,classes:[...(c.classes||[])].sort(cmp)};
 S.tab=S.me.role==="parent"?"child":"dash";try{await loadStudents()}catch(x){toast("Could not load data: "+x.message,true)}render()});
/* ---------- layout ---------- */
const NAV={admin:[["dash","📊","Dashboard"],["take","✅","Attendance"],["stu","🎓","Students"],["usr","👥","Users"],["rep","📄","Reports"],["pw","🔑","Password"]],
 teacher:[["dash","📊","Dashboard"],["take","✅","Attendance"],["rep","📄","Reports"],["pw","🔑","Password"]],parent:[["child","🎓","My Child"],["pw","🔑","Password"]]};
const empty=t=>`<div class="card empty">${t}</div>`;
const ksel=()=>{const ks=keys();if(!ks.includes(S.key))S.key=ks[0]||"";return `<select data-c="key">${ks.map(k=>`<option value="${e(k)}" ${k===S.key?"selected":""}>Class ${e(kn(k))}</option>`).join("")}</select>`};
function login(){return `<div class="login"><div class="lc"><img src="assets/logo.jpg" alt=""><h1>${SCH}</h1><p class="mu" style="margin:0 0 12px">Attendance Portal</p>
<input id="lu" placeholder="Username (Parents: GR No)" autocapitalize="off" autocomplete="username"><input id="lp" type="password" placeholder="Password" autocomplete="current-password"><button data-a="login" id="lb">Login</button>${S.err?`<div class="err">${e(S.err)}</div>`:""}</div></div>`}
async function render(){const r=$("#root");if(!S.me){r.innerHTML=login();return}
 const nav=NAV[S.me.role],cur=nav.find(n=>n[0]===S.tab)||nav[0];S.tab=cur[0];
 r.innerHTML=`<div class="shell"><aside class="sb"><div class="brand"><img src="assets/logo.jpg" alt=""><div><b>SAJ Academy</b><small>Hussainabad</small></div></div><div class="nav">${nav.map(n=>`<button class="${n[0]===S.tab?"on":""}" data-a="tab" data-t="${n[0]}">${n[1]} ${n[2]}</button>`).join("")}</div><button class="out" data-a="logout">⎋ Logout</button></aside>
 <main><div class="top"><button class="g menu" data-a="menu">☰</button><h2>${cur[2]}</h2><div class="chip"><span>${e(S.me.name)}</span><i>${S.me.role}</i></div></div><div id="view"><div class="empty">Loading...</div></div></main></div>`;
 const tab=S.tab;try{const h=await V[tab]();if(S.tab===tab&&$("#view"))$("#view").innerHTML=h}catch(x){$("#view").innerHTML=empty("Error: "+e(x.message))}}
/* ---------- views ---------- */
const V={};
V.dash=async()=>{const ks=keys();if(!ks.length)return empty(S.me.role==="admin"?"No students yet. Add or import them from the Students tab.":"No class has been assigned to you yet. Please contact the admin.");
 const d=today(),ds=[...Array(7)].map((_,i)=>{const x=new Date();x.setDate(x.getDate()-6+i);return ymd(x)}),rows=await attDates(ds,ks),n=S.students.length;
 const t=tally(rows.filter(x=>x.date===d)),mk=t.P+t.A+t.L+t.V;
 const card=(l,v,c)=>`<div class="kp" style="--c:var(--${c})"><small>${l}</small><b>${v}</b></div>`;
 const chart=ds.map(day=>{const c=tally(rows.filter(x=>x.date===day)),h=v=>Math.min(100,v*100/Math.max(n,1));
  return `<div class="col"><div class="stack" title="${day}"><div style="height:${h(c.P)}%;background:var(--ok)"></div><div style="height:${h(c.L)}%;background:var(--lt)"></div><div style="height:${h(c.V)}%;background:var(--lv)"></div><div style="height:${h(c.A)}%;background:var(--no)"></div></div><small>${day.slice(8)}/${day.slice(5,7)}</small></div>`}).join("");
 const tr=ks.map(k=>{const l=inKey(k),c=tally(rows.filter(x=>x.date===d&&x.key===k)),p=pct(c),m=c.P+c.A+c.L+c.V;
  return `<tr><td><b>${e(kn(k))}</b></td><td>${l.length}</td><td>${c.P}</td><td>${c.A}</td><td>${c.L}</td><td>${c.V}</td><td>${l.length-m}</td><td><div class="bar"><i style="width:${p}%"></i></div></td><td>${m?p+"%":"-"}</td></tr>`}).join("");
 return `<div class="cards">${card("Total Students",n,"pr")}${card("Present",t.P,"ok")}${card("Absent",t.A,"no")}${card("Late",t.L,"lt")}${card("Leave",t.V,"lv")}${card("Not marked",n-mk,"mu")}${card("Today %",mk?pct(t)+"%":"-","pr2")}</div>
 <div class="card"><h3>Last 7 days attendance</h3><div class="chart">${chart}</div><div class="legend"><span><i class="dot" style="background:var(--ok)"></i>Present</span><span><i class="dot" style="background:var(--lt)"></i>Late</span><span><i class="dot" style="background:var(--lv)"></i>Leave</span><span><i class="dot" style="background:var(--no)"></i>Absent</span></div></div>
 <div class="card"><h3>Today (${d}) - by class</h3><div class="tw"><table><tr><th>Class</th><th>Total</th><th>P</th><th>A</th><th>L</th><th>Lv</th><th>Pending</th><th>Rate</th><th>%</th></tr>${tr}</table></div></div>`};
V.take=async()=>{const ks=keys();if(!ks.length)return empty("No classes available.");const sel=ksel(),rows=await attKD(S.key,S.date);S.att={};rows.forEach(x=>S.att[x.gr]=x.status);
 const l=inKey(S.key);
 return `<div class="card"><h3>Take Attendance</h3><div class="row">${sel}<input type="date" value="${S.date}" max="${today()}" data-c="date"><button data-a="allp">Mark All Present</button><span id="cnt" class="mu"></span></div>
 <div class="tw"><table><tr><th>Roll</th><th>Student</th><th>Status</th></tr>${l.map(s=>`<tr data-r="${e(s.gr)}"><td>${e(s.roll)}</td><td><b>${e(s.name)}</b><br><span class="mu">GR ${e(s.gr)} | ${e(s.father)}</span></td><td><div class="st">${["P","A","L","V"].map(c=>`<button class="${c} ${S.att[s.gr]===c?"on":""}" data-a="mark" data-g="${e(s.gr)}" data-s="${c}">${c==="V"?"Lv":c}</button>`).join("")}</div></td></tr>`).join("")}</table></div>
 <p class="mu">P = Present, A = Absent, L = Late, Lv = Leave. Attendance is saved automatically on every click.</p></div>`};
V.stu=async()=>{const ks=keys(),q=S.sq.toLowerCase(),l=S.students.filter(s=>(S.sk==="all"||s.key===S.sk)&&(s.name+s.gr+s.father).toLowerCase().includes(q)).sort((a,b)=>cmp(a.key,b.key)||(+a.roll||0)-(+b.roll||0));
 const inp=(i,p,w)=>`<input id="${i}" placeholder="${p}" size="${w}">`;
 return `<div class="card"><h3>Add Student (manual)</h3><div class="row">${inp("sg","GR No *",8)}${inp("sn","Student name *",16)}${inp("sf","Father name",14)}${inp("sc","Class *",6)}${inp("ss","Section",6)}${inp("sr","Roll",5)}${inp("sp","Phone",12)}<button data-a="addstu">Add Student</button></div><p class="mu">Adding the same GR No again updates that student's details. A parent login is created automatically (username = GR No, password 1234).</p></div>
 <div class="card"><h3>Import from Excel / CSV</h3><p class="mu" style="margin-top:0">Columns: GR No, Name, Father, Class, Section, Roll, Phone</p><div class="row"><input type="file" accept=".xlsx,.xls,.csv" data-c="file"><button class="g" data-a="tpl">Sample template</button></div>${S.pend?`<div class="row"><b>${S.pend.length} students found.</b><button data-a="doimp">Import</button><button class="g" data-a="noimp">Cancel</button></div>`:""}</div>
 <div class="card"><h3>Students (${S.students.length})</h3><div class="row"><select data-c="sk"><option value="all">All classes</option>${ks.map(k=>`<option value="${e(k)}" ${S.sk===k?"selected":""}>${e(kn(k))}</option>`).join("")}</select><input placeholder="Search name / GR" value="${e(S.sq)}" data-c="sq"></div>
 <div class="tw"><table><tr><th>GR</th><th>Name</th><th>Father</th><th>Class</th><th>Roll</th><th>Phone</th><th></th></tr>${l.slice(0,300).map(s=>`<tr><td>${e(s.gr)}</td><td>${e(s.name)}</td><td>${e(s.father)}</td><td>${e(kn(s.key))}</td><td>${e(s.roll)}</td><td>${e(s.phone)}</td><td><button class="s ${S.cf==="s"+s.gr?"d":"g"}" data-a="delstu" data-g="${e(s.gr)}">${S.cf==="s"+s.gr?"Confirm delete?":"Delete"}</button></td></tr>`).join("")||'<tr><td colspan=7 class="mu">No students</td></tr>'}</table></div>${l.length>300?'<p class="mu">Showing the first 300. Use search or filter to narrow down.</p>':""}</div>`};
V.usr=async()=>{S.users=(await api("listUsers")).users;const ks=keys(),q=S.uq.toLowerCase();
 const l=S.users.filter(u=>(S.ur==="all"||u.role===S.ur)&&(u.username+(u.name||"")).toLowerCase().includes(q)).sort((a,b)=>cmp(a.role,b.role)||cmp(a.username,b.username));
 const cks=(sel,cls)=>ks.map(k=>`<label class="ck"><input type="checkbox" class="${cls}" value="${e(k)}" ${sel.includes(k)?"checked":""}>${e(kn(k))}</label>`).join("")||'<span class="mu">Add students first</span>';
 return `<div class="card"><h3>Create Teacher Login</h3><div class="row"><input id="tu" placeholder="Username"><input id="tn" placeholder="Teacher name"><input id="tp" placeholder="Password" value="1234"></div><div class="row"><b>Classes:</b>${cks([],"nk")}</div><button data-a="addtch">Add Teacher</button></div>
 <div class="card"><h3>All Users (${S.users.length})</h3><div class="row"><select data-c="ur">${["all","admin","teacher","parent"].map(r=>`<option value="${r}" ${S.ur===r?"selected":""}>${r}</option>`).join("")}</select><input placeholder="Search" value="${e(S.uq)}" data-c="uq"></div>
 <div class="tw"><table><tr><th>Username</th><th>Name</th><th>Role</th><th>Classes</th><th>Status</th><th>Actions</th></tr>${l.slice(0,300).map(u=>{const a=u.username,x=u.role!=="admin";
  const ed=S.edit===a?`<tr><td colspan=6><div class="row"><input id="en" value="${e(u.name)}">${cks(u.classes||[],"ek")}<button class="s" data-a="savetch" data-u="${e(a)}">Save</button></div></td></tr>`:"",pw=S.pwu===a?`<tr><td colspan=6><div class="row"><input id="np" placeholder="New password"><button class="s" data-a="setpw" data-u="${e(a)}">Set password</button></div></td></tr>`:"";
  return `<tr><td><b>${e(a)}</b></td><td>${e(u.name)}</td><td>${u.role}</td><td>${u.role==="teacher"?e((u.classes||[]).map(kn).join(", "))||"-":"-"}</td><td><span class="pill ${u.blocked?"no":"ok"}">${u.blocked?"Blocked":"Active"}</span></td><td>${x?`<div class="row" style="margin:0"><button class="s g" data-a="blk" data-u="${e(a)}">${u.blocked?"Unblock":"Block"}</button><button class="s g" data-a="rpw" data-u="${e(a)}">Reset 1234</button><button class="s g" data-a="spw" data-u="${e(a)}">Set pw</button>${u.role==="teacher"?`<button class="s g" data-a="edt" data-u="${e(a)}">Edit</button>`:""}<button class="s ${S.cf==="u"+a?"d":"g"}" data-a="delu" data-u="${e(a)}">${S.cf==="u"+a?"Confirm?":"Delete"}</button></div>`:"-"}</td></tr>${ed}${pw}`}).join("")}</table></div></div>`};
V.rep=async()=>{if(!keys().length)return empty("No classes available.");
 return `<div class="card"><h3>PDF Reports</h3><div class="row">${ksel()}</div><div class="row"><b style="width:70px">Daily</b><input type="date" value="${S.date}" max="${today()}" data-c="date"><button data-a="pdfd">Daily PDF</button></div><div class="row"><b style="width:70px">Monthly</b><input type="month" value="${S.month}" data-c="month"><button data-a="pdfm">Monthly PDF</button></div></div>`};
V.child=async()=>{const s=S.students[0];if(!s)return empty("Student record not found.");
 const rows=await rd([query(ac,where("gr","==",s.gr),where("month","==",S.month))]),m={};rows.forEach(x=>m[x.date]=x.status);const c=tally(rows),[y,mo]=S.month.split("-").map(Number),n=new Date(y,mo,0).getDate(),off=(new Date(y,mo-1,1).getDay()+6)%7;
 let cal=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>`<div class="h">${d}</div>`).join("")+"<div style='background:none'></div>".repeat(off);
 for(let i=1;i<=n;i++){const v=m[S.month+"-"+String(i).padStart(2,"0")];cal+=`<div class="${v||""}">${i}<b>${v?NM[v]:""}</b></div>`}
 const card=(l,v,k)=>`<div class="kp" style="--c:var(--${k})"><small>${l}</small><b>${v}</b></div>`;
 return `<div class="card"><h3>${e(s.name)}</h3><p class="mu" style="margin:0">GR ${e(s.gr)} | Class ${e(kn(s.key))} | Roll ${e(s.roll)} | Father: ${e(s.father)}</p></div>
 <div class="row"><input type="month" value="${S.month}" data-c="month"></div><div class="cards">${card("Present",c.P,"ok")}${card("Absent",c.A,"no")}${card("Late",c.L,"lt")}${card("Leave",c.V,"lv")}${card("Attendance %",c.P+c.A+c.L+c.V?pct(c)+"%":"-","pr")}</div>
 <div class="card"><h3>${S.month} calendar</h3><div class="cal">${cal}</div></div>`};
V.pw=async()=>`<div class="card" style="max-width:460px"><h3>Change Password</h3><div class="row"><input id="po" type="password" placeholder="Current password" style="width:100%"></div><div class="row"><input id="pn" type="password" placeholder="New password" style="width:100%"></div><div class="row"><input id="pc" type="password" placeholder="Confirm new password" style="width:100%"></div><button data-a="chpw">Save Password</button></div>`;
/* ---------- actions ---------- */
const v=i=>($("#"+i)?.value||"").trim(),ck=c=>[...document.querySelectorAll("."+c+":checked")].map(x=>x.value);
const H={
 async login(){const b=$("#lb");b.disabled=true;try{const r=await api("login",{username:v("lu"),password:$("#lp").value});S.err="";await signInWithCustomToken(auth,r.token)}catch(x){S.err=x.message;render()}},
 tab(d){S.tab=d.t;S.cf="";S.edit="";S.pwu="";document.body.classList.remove("mo");render()},menu(){document.body.classList.toggle("mo")},logout(){signOut(auth)},
 async mark(d){if(S.date>today())return toast("Attendance cannot be marked for a future date",true);const st=S.students.find(x=>x.gr===d.g);
  await run(async()=>{await setDoc(doc(db,"att",S.date+"_"+d.g),{gr:d.g,date:S.date,month:S.date.slice(0,7),key:st.key,status:d.s,by:S.me.u,at:Date.now()});S.att[d.g]=d.s;paint(d.g)})},
 async allp(){if(S.date>today())return toast("Attendance cannot be marked for a future date",true);await run(async()=>{const l=inKey(S.key);
  for(let i=0;i<l.length;i+=400){const b=writeBatch(db);l.slice(i,i+400).forEach(s=>b.set(doc(db,"att",S.date+"_"+s.gr),{gr:s.gr,date:S.date,month:S.date.slice(0,7),key:s.key,status:"P",by:S.me.u,at:Date.now()}));await b.commit()}
  l.forEach(s=>{S.att[s.gr]="P";paint(s.gr)});toast("All marked present")})},
 async addstu(){await run(async()=>{const r=await api("importStudents",{rows:[{gr:v("sg"),name:v("sn"),father:v("sf"),cls:v("sc"),sec:v("ss"),roll:v("sr"),phone:v("sp")}]});if(!r.added&&!r.updated)throw new Error("GR No, Name and Class are required");await loadStudents();toast(r.added?"Student added":"Student updated");render()})},
 tpl(){const ws=XLSX.utils.aoa_to_sheet([["GR No","Name","Father","Class","Section","Roll","Phone"],["1001","Ali Khan","Ahmed Khan","5","A","1","03001234567"]]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Students");XLSX.writeFile(wb,"students-template.xlsx")},
 async doimp(){await run(async()=>{let a=0,u=0,k=0;for(let i=0;i<S.pend.length;i+=300){toast("Importing... "+Math.min(i+300,S.pend.length)+"/"+S.pend.length);const r=await api("importStudents",{rows:S.pend.slice(i,i+300)});a+=r.added;u+=r.updated;k+=r.skipped}
  S.pend=null;await loadStudents();toast(`${a} added, ${u} updated, ${k} skipped`);render()})},noimp(){S.pend=null;render()},
 async delstu(d){if(S.cf!=="s"+d.g){S.cf="s"+d.g;return render()}S.cf="";await run(async()=>{await api("deleteStudent",{gr:d.g});await loadStudents();toast("Student deleted");render()})},
 async addtch(){await run(async()=>{await api("createTeacher",{username:v("tu"),name:v("tn"),password:v("tp"),classes:ck("nk")});toast("Teacher login created");render()})},
 edt(d){S.edit=S.edit===d.u?"":d.u;render()},async savetch(d){await run(async()=>{await api("updateTeacher",{username:d.u,name:v("en"),classes:ck("ek")});S.edit="";toast("Teacher updated (class changes apply at next login)");render()})},
 spw(d){S.pwu=S.pwu===d.u?"":d.u;render()},async setpw(d){await run(async()=>{await api("setPassword",{username:d.u,password:v("np")});S.pwu="";toast("Password set");render()})},
 async rpw(d){await run(async()=>{await api("resetPassword",{username:d.u});toast(d.u+" password reset to 1234")})},
 async blk(d){const u=S.users.find(x=>x.username===d.u);await run(async()=>{await api("blockUser",{username:d.u,blocked:!u.blocked});toast(u.blocked?"User unblocked":"User blocked (an existing session may last up to 1 hour)");render()})},
 async delu(d){if(S.cf!=="u"+d.u){S.cf="u"+d.u;return render()}S.cf="";await run(async()=>{await api("deleteUser",{username:d.u});toast("User deleted");render()})},
 async chpw(){if(v("pn")!==v("pc"))return toast("New passwords do not match",true);await run(async()=>{await api("changePassword",{oldPassword:$("#po").value,newPassword:$("#pn").value});toast("Password changed");render()})},
 pdfd(){pdf("d")},pdfm(){pdf("m")}};
function paint(g){const r=document.querySelector(`tr[data-r="${CSS.escape(g)}"]`);if(r)r.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.s===S.att[g]));
 const c=tally(Object.values(S.att).map(status=>({status})));const el=$("#cnt");if(el)el.textContent=`P ${c.P} | A ${c.A} | L ${c.L} | Lv ${c.V}`}
const CH={key(x){S.key=x.value;render()},date(x){S.date=x.value||today();render()},month(x){S.month=x.value;render()},sk(x){S.sk=x.value;render()},sq(x){S.sq=x.value;render()},ur(x){S.ur=x.value;render()},uq(x){S.uq=x.value;render()},
 async file(x){const f=x.files[0];if(!f)return;await run(async()=>{const wb=XLSX.read(await f.arrayBuffer()),js=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
  const pick=(o,ns)=>{for(const k in o)if(ns.includes(k.toLowerCase().replace(/[^a-z]/g,"")))return String(o[k]).trim();return ""};
  S.pend=js.map(o=>({gr:pick(o,["gr","grno","grnumber","regno","admissionno"]),name:pick(o,["name","studentname"]),father:pick(o,["father","fathername"]),cls:pick(o,["class","grade"]),sec:pick(o,["section","sec"]),roll:pick(o,["roll","rollno","rollnumber"]),phone:pick(o,["phone","mobile","contact","phoneno"])})).filter(r=>r.gr&&r.name&&r.cls);
  if(!S.pend.length){S.pend=null;throw new Error("Required columns not found. See the sample template")}render()})}};
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-a]");if(b&&H[b.dataset.a])H[b.dataset.a](b.dataset)});
document.addEventListener("change",ev=>{const c=ev.target.dataset?.c;if(c&&CH[c])CH[c](ev.target)});
document.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&(ev.target.id==="lu"||ev.target.id==="lp"))H.login()});
/* ---------- PDF ---------- */
async function pdf(t){await run(async()=>{const k=S.key,l=inKey(k);if(!l.length)throw new Error("No students in this class");
 const doc=new window.jspdf.jsPDF(t==="m"?"l":"p"),rows=t==="d"?await attKD(k,S.date):await attMonth(k,S.month);
 if(LOGO)doc.addImage(LOGO,"JPEG",14,8,18,18);doc.setFontSize(16);doc.text(SCH,36,16);doc.setFontSize(10);doc.text((t==="m"?"Monthly Attendance - "+S.month:"Daily Attendance - "+S.date)+" | Class "+kn(k),36,23);
 let head,body;if(t==="d"){const m={};rows.forEach(x=>m[x.gr]=x.status);head=[["Roll","GR No","Name","Father","Status"]];body=l.map(s=>[s.roll,s.gr,s.name,s.father,NM[m[s.gr]]||"-"]);const c=tally(rows);doc.text(`Present ${c.P} | Absent ${c.A} | Late ${c.L} | Leave ${c.V} | Not marked ${l.length-rows.length}`,14,32)}
 else{const [y,mo]=S.month.split("-").map(Number),n=new Date(y,mo,0).getDate(),m={};rows.forEach(x=>m[x.gr+"|"+x.date]=x.status);
  head=[["Roll","GR","Name",...[...Array(n)].map((_,i)=>i+1),"P","A","L","Lv","%"]];
  body=l.map(s=>{const c={P:0,A:0,L:0,V:0},r=[...Array(n)].map((_,i)=>{const x=m[s.gr+"|"+S.month+"-"+String(i+1).padStart(2,"0")];if(x)c[x]++;return x==="V"?"Lv":x||""});return [s.roll,s.gr,s.name,...r,c.P,c.A,c.L,c.V,pct(c)||(c.A+c.P+c.L+c.V?0:"")]})}
 doc.autoTable({head,body,startY:36,theme:"grid",styles:{fontSize:t==="m"?6:9,cellPadding:t==="m"?1:2},headStyles:{fillColor:[30,58,159]}});
 doc.save(`attendance-${t==="m"?S.month:S.date}-class-${k.replace("|","-")}.pdf`)})}
