import { useState, useEffect } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const STAGES = [
  { id:"lead",   label:"Lead",      color:"#6B7280", light:"#F3F4F6", border:"#D1D5DB" },
  { id:"warm",   label:"Warm Lead", color:"#D97706", light:"#FFFBEB", border:"#FDE68A" },
  { id:"hot",    label:"Hot Lead",  color:"#DC2626", light:"#FEF2F2", border:"#FECACA" },
  { id:"signed", label:"Signed",    color:"#059669", light:"#F0FDF4", border:"#A7F3D0" },
  { id:"lost",   label:"Lost",      color:"#4B5563", light:"#F9FAFB", border:"#E5E7EB" },
];
const LOST_REASONS   = ["Price","Timing","Competitor","No Response","Budget Frozen","Wrong Fit","Other"];
const LEAD_SOURCES   = ["Referral","Website","LinkedIn","Cold Outreach","Event","Partner","Other"];
const ACTIVITY_TYPES = ["Call","Email","Meeting","Note"];
const REPS           = ["Sarah Mitchell","James Holt","Tom Reeves","Priya Sharma"];
const REP_TARGETS    = { "Sarah Mitchell":25000, "James Holt":20000, "Tom Reeves":22000, "Priya Sharma":18000 };
const STAGE_WEIGHT   = { lead:0.1, warm:0.3, hot:0.7, signed:1, lost:0 };
const STALE_DAYS     = { lead:5, warm:7, hot:4 };
const DAY            = 86400000;
const NOW            = Date.now();
const API = import.meta.env.VITE_API_URL;
const STORAGE_KEY    = "crm_v4";
const TASKS_KEY      = "crm_tasks_v2";
const SESSION_KEY    = "crm_session_v2";

// ── CSV template columns ─────────────────────────────────────────────────────
const CSV_COLS = [
  { key:"company",    header:"Company",      required:true,  example:"Apex Digital",        note:"Business name" },
  { key:"contact",    header:"Contact Name", required:true,  example:"Sarah Mitchell",       note:"Person you deal with" },
  { key:"email",      header:"Email",        required:false, example:"sarah@apex.co",        note:"" },
  { key:"phone",      header:"Phone",        required:false, example:"07700 900123",         note:"" },
  { key:"source",     header:"Source",       required:false, example:"Referral",             note:`One of: ${LEAD_SOURCES.join(", ")}` },
  { key:"stage",      header:"Stage",        required:false, example:"Lead",                 note:"Defaults to Lead if blank" },
  { key:"value",      header:"Deal Value",   required:false, example:"12500",                note:"Numbers only. Required if Warm or later." },
  { key:"rep",        header:"Assigned Rep", required:false, example:"Sarah Mitchell",       note:`One of: ${REPS.join(", ")}` },
  { key:"notes",      header:"Notes",        required:false, example:"Demo went well",       note:"" },
  { key:"lostReason", header:"Lost Reason",  required:false, example:"",                     note:`Only if Lost. One of: ${LOST_REASONS.join(", ")}` },
];

// ── Demo data ────────────────────────────────────────────────────────────────
const DEMO_LEADS = [
  { id:"1",  company:"Apex Digital",     contact:"Sarah Mitchell", email:"sarah@apexdigital.co",   phone:"07700 900123", source:"Referral",      stage:"hot",    value:12500, notes:"Demo went well",          createdAt:NOW-DAY*5,  lostReason:null,         rep:"Sarah Mitchell", lastContactedAt:NOW-DAY*1, activities:[{id:"a1",type:"Call",note:"Discovery call",at:NOW-DAY*5},{id:"a2",type:"Meeting",note:"Demo — very positive",at:NOW-DAY*1}] },
  { id:"2",  company:"Bright & Co",      contact:"James Holt",     email:"james@brightco.com",     phone:"07700 900456", source:"LinkedIn",      stage:"warm",   value:8000,  notes:"Proposal sent",           createdAt:NOW-DAY*3,  lostReason:null,         rep:"James Holt",     lastContactedAt:NOW-DAY*9, activities:[{id:"a3",type:"Email",note:"Sent proposal PDF",at:NOW-DAY*9}] },
  { id:"3",  company:"Meridian Law",     contact:"Priya Sharma",   email:"p.sharma@meridian.co.uk",phone:"",             source:"Event",         stage:"lead",   value:null,  notes:"Met at Legal Summit",     createdAt:NOW-DAY*1,  lostReason:null,         rep:"Priya Sharma",   lastContactedAt:NOW-DAY*1, activities:[{id:"a4",type:"Meeting",note:"Met at Legal Summit",at:NOW-DAY*1}] },
  { id:"4",  company:"Stackfield Tech",  contact:"Tom Reeves",     email:"tom@stackfield.io",      phone:"07700 900789", source:"Website",       stage:"signed", value:22000, notes:"12-month contract",       createdAt:NOW-DAY*10, lostReason:null,         rep:"Tom Reeves",     lastContactedAt:NOW-DAY*2, activities:[{id:"a5",type:"Call",note:"Contract signed",at:NOW-DAY*2}] },
  { id:"5",  company:"Nordic Foods",     contact:"Anna Berg",      email:"anna@nordicfoods.com",   phone:"",             source:"Cold Outreach", stage:"lost",   value:5000,  notes:"Went with competitor",    createdAt:NOW-DAY*7,  lostReason:"Competitor", rep:"Sarah Mitchell", lastContactedAt:NOW-DAY*7, activities:[] },
  { id:"6",  company:"Clearview Media",  contact:"James Holt",     email:"j@clearview.tv",         phone:"",             source:"Referral",      stage:"hot",    value:18000, notes:"Budget approved",         createdAt:NOW-DAY*2,  lostReason:null,         rep:"James Holt",     lastContactedAt:NOW-DAY*6, activities:[{id:"a6",type:"Call",note:"Budget confirmed",at:NOW-DAY*6}] },
  { id:"7",  company:"Orion Consulting", contact:"Tom Reeves",     email:"t@orionconsult.co.uk",   phone:"07700 911000", source:"LinkedIn",      stage:"warm",   value:9500,  notes:"Follow-up call booked",  createdAt:NOW-DAY*4,  lostReason:null,         rep:"Tom Reeves",     lastContactedAt:NOW-DAY*4, activities:[{id:"a7",type:"Email",note:"Sent info pack",at:NOW-DAY*4}] },
  { id:"8",  company:"Vega Retail",      contact:"Priya Sharma",   email:"priya@vega.co",          phone:"",             source:"Event",         stage:"lead",   value:null,  notes:"Interested in Q3",        createdAt:NOW-DAY*1,  lostReason:null,         rep:"Priya Sharma",   lastContactedAt:NOW-DAY*1, activities:[] },
  { id:"9",  company:"BlueSky HR",       contact:"Sarah Mitchell", email:"s@blueskyhr.com",        phone:"07700 922000", source:"Website",       stage:"signed", value:14000, notes:"Onboarding in progress",  createdAt:NOW-DAY*12, lostReason:null,         rep:"Sarah Mitchell", lastContactedAt:NOW-DAY*3, activities:[] },
  { id:"10", company:"Fenix Solutions",  contact:"James Holt",     email:"j@fenixsol.io",          phone:"",             source:"Partner",       stage:"lead",   value:null,  notes:"Initial call scheduled",  createdAt:NOW,        lostReason:null,         rep:"James Holt",     lastContactedAt:NOW,       activities:[] },
];
const DEMO_TASKS = [
  { id:"t1", leadId:"1", leadCompany:"Apex Digital",     rep:"Sarah Mitchell", title:"Send contract for signature", dueAt:NOW+DAY*1, done:false },
  { id:"t2", leadId:"2", leadCompany:"Bright & Co",      rep:"James Holt",     title:"Chase proposal feedback",     dueAt:NOW-DAY*2, done:false },
  { id:"t3", leadId:"6", leadCompany:"Clearview Media",  rep:"James Holt",     title:"Schedule final demo",         dueAt:NOW-DAY*1, done:false },
  { id:"t4", leadId:"7", leadCompany:"Orion Consulting", rep:"Tom Reeves",     title:"Follow-up call",              dueAt:NOW+DAY*2, done:false },
  { id:"t5", leadId:"3", leadCompany:"Meridian Law",     rep:"Priya Sharma",   title:"Send intro email",            dueAt:NOW,       done:false },
  { id:"t6", leadId:"4", leadCompany:"Stackfield Tech",  rep:"Tom Reeves",     title:"Kick off onboarding call",    dueAt:NOW-DAY*5, done:true  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt       = v => (v!=null && v!=="" ? "£"+Number(v).toLocaleString("en-GB") : "—");
const initials  = n => n ? n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
const repColor  = str => { const c=["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#6366F1"]; let h=0; for(let x of(str||""))h=x.charCodeAt(0)+((h<<5)-h); return c[Math.abs(h)%c.length]; };
const isStale   = l => { const t=STALE_DAYS[l.stage]; return t && l.lastContactedAt && (NOW-l.lastContactedAt)/DAY>t; };
const daysAgo   = ts => { if(!ts)return null; const d=Math.floor((NOW-ts)/DAY); return d<=0?"today":d===1?"yesterday":`${d}d ago`; };
const dueLabel  = at => { const d=Math.ceil((at-NOW)/DAY); return d<0?{text:`${Math.abs(d)}d overdue`,color:"#DC2626"}:d===0?{text:"Due today",color:"#D97706"}:d===1?{text:"Due tomorrow",color:"#D97706"}:{text:`Due in ${d}d`,color:"#6B7280"}; };
const wForecast = ls => ls.reduce((s,l)=>s+(l.value||0)*(STAGE_WEIGHT[l.stage]??0),0);
const norm      = h => String(h||"").trim().toLowerCase().replace(/[\s_]+/g,"");

const ALIASES = {
  company:["company","companyname","business","businessname","account"],
  contact:["contactname","contact","name","fullname"],
  email:["email","emailaddress"],
  phone:["phone","phonenumber","tel","telephone","mobile"],
  source:["source","leadsource"],
  stage:["stage","status","pipelinestage"],
  value:["dealvalue","value","amount","revenue"],
  rep:["assignedrep","rep","owner","salesrep","assignedto"],
  notes:["notes","note","comments","description"],
  lostReason:["lostreason","reasonlost","lossreason"],
};

function matchCol(h) { for(const[k,a]of Object.entries(ALIASES))if(a.some(x=>norm(x)===norm(h)))return k; return null; }
function matchStage(v) { const n=String(v||"").trim().toLowerCase(); const f=STAGES.find(s=>s.label.toLowerCase()===n||s.id===n); return f?f.id:null; }
function matchList(v,list) { const n=String(v||"").trim().toLowerCase(); return list.find(i=>i.toLowerCase()===n)||""; }

// CSV parse/download
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if(lines.length<2) return [];
  const headers = lines[0].split(",").map(h=>h.replace(/^"|"$/g,"").trim());
  return lines.slice(1).map(line=>{
    const vals=[]; let cur="",inQ=false;
    for(const ch of line){if(ch==='"')inQ=!inQ;else if(ch===","&&!inQ){vals.push(cur);cur="";}else cur+=ch;}
    vals.push(cur);
    return Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||"").replace(/^"|"$/g,"").trim()]));
  });
}

function mapRowsToLeads(rows) {
  if(!rows.length) return {leads:[],errors:["File is empty."],warnings:[]};
  const colMap={};
  Object.keys(rows[0]).forEach(h=>{const m=matchCol(h);if(m)colMap[h]=m;});
  const missing=CSV_COLS.filter(c=>c.required&&!Object.values(colMap).includes(c.key));
  if(missing.length) return {leads:[],errors:[`Missing column(s): ${missing.map(c=>c.header).join(", ")}`],warnings:[]};
  const leads=[],warnings=[];
  rows.forEach((row,i)=>{
    const get=k=>{const rk=Object.keys(colMap).find(h=>colMap[h]===k);return rk?String(row[rk]??"").trim():"";};
    const company=get("company"),contact=get("contact");
    if(!company&&!contact)return;
    if(!company){warnings.push(`Row ${i+2}: missing Company — skipped.`);return;}
    if(!contact){warnings.push(`Row ${i+2}: missing Contact — skipped.`);return;}
    const stageRaw=get("stage"),stage=stageRaw?matchStage(stageRaw):"lead";
    if(stageRaw&&!stage)warnings.push(`Row ${i+2}: stage "${stageRaw}" not recognised — defaulted to Lead.`);
    const finalStage=stage||"lead";
    const valueRaw=get("value").replace(/[£$,]/g,""),value=valueRaw?Number(valueRaw):null;
    if(valueRaw&&isNaN(value))warnings.push(`Row ${i+2}: deal value "${valueRaw}" isn't a number.`);
    if(["warm","hot","signed","lost"].includes(finalStage)&&!value)warnings.push(`Row ${i+2}: ${finalStage} stage needs a deal value.`);
    const repRaw=get("rep"),rep=matchList(repRaw,REPS);
    if(repRaw&&!rep)warnings.push(`Row ${i+2}: rep "${repRaw}" not recognised — left unassigned.`);
    leads.push({id:crypto.randomUUID(),company,contact,email:get("email"),phone:get("phone"),
      source:matchList(get("source"),LEAD_SOURCES)||"Other",stage:finalStage,
      value:(value&&!isNaN(value))?value:null,notes:get("notes"),createdAt:Date.now(),
      lostReason:finalStage==="lost"?(matchList(get("lostReason"),LOST_REASONS)||get("lostReason")||null):null,
      rep,lastContactedAt:null,activities:[]});
  });
  return {leads,errors:[],warnings};
}

function downloadCSVTemplate() {
  const headers=CSV_COLS.map(c=>c.header).join(",");
  const example=CSV_COLS.map(c=>`"${c.example}"`).join(",");
  const blob=new Blob([headers+"\n"+example],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="pipelinehq-template.csv"; a.click();
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────
const iS = { width:"100%",boxSizing:"border-box",padding:"8px 10px",border:"1px solid #D1D5DB",borderRadius:7,fontSize:13,color:"#111827",background:"#F9FAFB",outline:"none",fontFamily:"inherit",display:"block" };

function Field({label,children}){
  return <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</div>{children}</div>;
}
function StatCard({label,value,color}){
  return <div style={{flex:"1 1 110px",background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${color}`}}><div style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div><div style={{fontSize:18,fontWeight:800,color:"#111827"}}>{value}</div></div>;
}
function Logo(){
  return <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:24,height:24,background:"#3B82F6",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11 L4 6 L7 8 L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div><span style={{color:"#fff",fontWeight:800,fontSize:13,letterSpacing:"-0.03em"}}>PipelineHQ</span></div>;
}
function NavTabs({tabs,active,onSelect,tasks}){
  const overdue=tasks?tasks.filter(t=>!t.done&&Math.ceil((t.dueAt-NOW)/DAY)<0).length:0;
  return <div style={{display:"flex",gap:2,background:"#1F2937",borderRadius:7,padding:"3px"}}>{tabs.map(v=><button key={v} onClick={()=>onSelect(v)} style={{padding:"4px 11px",borderRadius:5,border:"none",background:active===v?"#fff":"transparent",color:active===v?"#111827":"#9CA3AF",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",position:"relative"}}>{v==="upload"?"Upload":v.charAt(0).toUpperCase()+v.slice(1)}{v==="tasks"&&overdue>0&&<span style={{position:"absolute",top:2,right:2,width:6,height:6,borderRadius:"50%",background:"#EF4444"}}/>}</button>)}</div>;
}
function RepOrgTabs({repFilter,setRepFilter}){
  return <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 18px",display:"flex",alignItems:"center",gap:2,overflowX:"auto"}}><button onClick={()=>setRepFilter("org")} style={{padding:"10px 13px",border:"none",background:"transparent",borderBottom:repFilter==="org"?"2px solid #3B82F6":"2px solid transparent",color:repFilter==="org"?"#3B82F6":"#6B7280",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>🏢 Organisation</button>{REPS.map(rep=><button key={rep} onClick={()=>setRepFilter(rep)} style={{padding:"10px 13px",border:"none",background:"transparent",borderBottom:repFilter===rep?`2px solid ${repColor(rep)}`:"2px solid transparent",color:repFilter===rep?repColor(rep):"#6B7280",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}><div style={{width:16,height:16,borderRadius:"50%",background:repColor(rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:700,color:"#fff"}}>{initials(rep)}</div>{rep.split(" ")[0]}</button>)}</div>;
}
function QuotaBar({signed,target,label}){
  const pct=target?Math.min(Math.round((signed/target)*100),100):0;
  const col=pct>=100?"#059669":pct>=60?"#3B82F6":"#F59E0B";
  return <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:"12px 16px",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{label||"Monthly quota"}</div><div style={{fontSize:12,color:"#6B7280"}}>{fmt(signed)} / {fmt(target)} <span style={{fontWeight:700,color:col}}>({pct}%)</span></div></div><div style={{background:"#F3F4F6",borderRadius:6,height:8}}><div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:6,transition:"width 0.5s"}}/></div></div>;
}

// ── Visual Funnel ────────────────────────────────────────────────────────────
function VisualFunnel({leads,onStageClick,activeStage}){
  const signed=leads.filter(l=>l.stage==="signed"),lost=leads.filter(l=>l.stage==="lost");
  const signedVal=signed.reduce((s,l)=>s+(l.value||0),0),lostVal=lost.reduce((s,l)=>s+(l.value||0),0);
  const winRate=(signed.length+lost.length)?Math.round(signed.length/(signed.length+lost.length)*100):0;
  const pipeline=leads.filter(l=>!["signed","lost"].includes(l.stage)).reduce((s,l)=>s+(l.value||0),0);
  const active=leads.filter(l=>!["signed","lost"].includes(l.stage)).length;
  const lostBreakdown=LOST_REASONS.map(r=>({reason:r,count:lost.filter(l=>l.lostReason===r).length})).filter(r=>r.count>0).sort((a,b)=>b.count-a.count);
  const widths=[100,74,48];
  const funnelStages=STAGES.slice(0,3);
  return (
    <div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <StatCard label="Active Pipeline" value={fmt(pipeline)} color="#3B82F6"/>
        <StatCard label="Active Deals" value={active} color="#F59E0B"/>
        <StatCard label="Signed Revenue" value={fmt(signedVal)} color="#059669"/>
        <StatCard label="Win Rate" value={`${winRate}%`} color="#8B5CF6"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,maxWidth:520,margin:"0 auto 20px"}}>
        {funnelStages.map((stage,i)=>{
          const sl=leads.filter(l=>l.stage===stage.id),count=sl.length,value=sl.reduce((s,l)=>s+(l.value||0),0);
          const prev=i>0?leads.filter(l=>l.stage===funnelStages[i-1].id).length:null;
          const conv=prev&&prev>0?Math.round(count/prev*100):null;
          const isActive=activeStage===stage.id;
          return <div key={stage.id} style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
            {i>0&&<div style={{display:"flex",alignItems:"center",gap:6,margin:"3px 0"}}><div style={{width:1,height:12,background:"#D1D5DB"}}/>{conv!==null&&<span style={{fontSize:10,color:"#9CA3AF",fontWeight:600}}>{conv}% conversion</span>}<div style={{width:1,height:12,background:"#D1D5DB"}}/></div>}
            <button onClick={()=>onStageClick(stage.id)} style={{width:`${widths[i]}%`,background:isActive?stage.color:stage.light,border:`2px solid ${isActive?stage.color:stage.border}`,borderRadius:i===0?"12px 12px 0 0":i===2?"0 0 12px 12px":"0",padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.18s",boxShadow:isActive?`0 4px 18px ${stage.color}44`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:"50%",background:isActive?"#fff":stage.color}}/><span style={{fontWeight:700,fontSize:14,color:isActive?"#fff":"#111827"}}>{stage.label}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:18}}>
                <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:isActive?"#fff":"#111827",lineHeight:1}}>{count}</div><div style={{fontSize:10,color:isActive?"rgba(255,255,255,0.65)":"#9CA3AF"}}>deals</div></div>
                {value>0&&<div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:isActive?"#fff":stage.color}}>{fmt(value)}</div><div style={{fontSize:10,color:isActive?"rgba(255,255,255,0.65)":"#9CA3AF"}}>value</div></div>}
              </div>
            </button>
          </div>;
        })}
        <div style={{display:"flex",gap:10,marginTop:14,width:"100%"}}>
          {[{id:"signed",label:"Signed",icon:"✓",count:signed.length,val:signedVal,ac:"#059669",lc:"#F0FDF4",bc:"#A7F3D0"},{id:"lost",label:"Lost",icon:"✕",count:lost.length,val:lostVal,ac:"#4B5563",lc:"#F9FAFB",bc:"#E5E7EB"}].map(o=>{
            const isActive=activeStage===o.id;
            return <button key={o.id} onClick={()=>onStageClick(o.id)} style={{flex:1,padding:"12px 14px",borderRadius:10,cursor:"pointer",background:isActive?o.ac:o.lc,border:`2px solid ${isActive?o.ac:o.bc}`,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.18s"}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:14,color:isActive?"#fff":o.ac}}>{o.icon}</span><span style={{fontWeight:700,fontSize:13,color:isActive?"#fff":o.ac}}>{o.label}</span></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:isActive?"#fff":o.ac}}>{o.count}</div><div style={{fontSize:11,color:isActive?"rgba(255,255,255,0.75)":"#6B7280"}}>{fmt(o.val)}</div></div>
            </button>;
          })}
        </div>
      </div>
      {lostBreakdown.length>0&&<div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"14px 18px",marginBottom:20,maxWidth:520,margin:"0 auto 20px"}}><div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Why deals are lost</div>{lostBreakdown.map(({reason,count})=><div key={reason} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}><div style={{fontSize:12,color:"#374151",width:100,flexShrink:0}}>{reason}</div><div style={{flex:1,background:"#F3F4F6",borderRadius:4,height:7}}><div style={{width:`${count/lost.length*100}%`,height:"100%",background:"#EF4444",borderRadius:4}}/></div><div style={{fontSize:12,fontWeight:700,color:"#374151",width:14,textAlign:"right"}}>{count}</div></div>)}</div>}
    </div>
  );
}

// ── Lead Row (funnel drill-down) ─────────────────────────────────────────────
function LeadRow({lead,onEdit,onMove}){
  const stage=STAGES.find(s=>s.id===lead.stage),idx=STAGES.findIndex(s=>s.id===lead.stage),stale=isStale(lead);
  return <div onClick={()=>onEdit(lead)} style={{background:"#fff",border:stale?"1px solid #FECACA":"1px solid #E5E7EB",borderRadius:10,padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,marginBottom:8}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
    <div style={{width:34,height:34,borderRadius:8,background:repColor(lead.company),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(lead.company)}</div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontWeight:600,fontSize:13,color:"#111827"}}>{lead.company}</div>{stale&&<span style={{width:7,height:7,borderRadius:"50%",background:"#EF4444",flexShrink:0}}/>}</div>
      <div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{lead.contact} · {lead.source}{lead.lastContactedAt?` · ${daysAgo(lead.lastContactedAt)}`:""}</div>
    </div>
    {lead.rep&&<div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}><div style={{width:20,height:20,borderRadius:"50%",background:repColor(lead.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>{initials(lead.rep)}</div><span style={{fontSize:11,color:"#6B7280"}}>{lead.rep.split(" ")[0]}</span></div>}
    {lead.value?<div style={{fontSize:13,fontWeight:700,color:stage.color,flexShrink:0}}>{fmt(lead.value)}</div>:null}
    {lead.lostReason&&<div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",background:"#F3F4F6",padding:"2px 7px",borderRadius:4,flexShrink:0}}>{lead.lostReason}</div>}
    <div style={{display:"flex",gap:5,flexShrink:0}} onClick={e=>e.stopPropagation()}>
      {idx>0&&!["signed","lost"].includes(lead.stage)&&<button onClick={()=>onMove(lead,"back")} style={{fontSize:11,padding:"3px 8px",border:"1px solid #E5E7EB",borderRadius:5,background:"#fff",color:"#6B7280",cursor:"pointer"}}>← Back</button>}
      {idx<3&&<button onClick={()=>onMove(lead,"forward")} style={{fontSize:11,padding:"3px 8px",border:`1px solid ${stage.color}`,borderRadius:5,background:stage.light,color:stage.color,fontWeight:600,cursor:"pointer"}}>{idx===2?"Sign →":"Forward →"}</button>}
      {idx===2&&<button onClick={()=>onMove(lead,"lost")} style={{fontSize:11,padding:"3px 8px",border:"1px solid #E5E7EB",borderRadius:5,background:"#fff",color:"#9CA3AF",cursor:"pointer"}}>Lost</button>}
    </div>
  </div>;
}

// ── Kanban ───────────────────────────────────────────────────────────────────
function KanbanBoard({leads,onEdit,onMove}){
  return <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8}}>
    {STAGES.map(stage=>{
      const sl=leads.filter(l=>l.stage===stage.id),val=sl.reduce((s,l)=>s+(l.value||0),0);
      return <div key={stage.id} style={{minWidth:210,flex:"1 1 210px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:stage.color}}/><span style={{fontSize:11,fontWeight:700,color:"#374151"}}>{stage.label}</span><span style={{background:stage.light,color:stage.color,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:8,border:`1px solid ${stage.border}`}}>{sl.length}</span></div>
          {val>0&&<span style={{fontSize:10,color:"#6B7280",fontWeight:600}}>{fmt(val)}</span>}
        </div>
        <div style={{background:stage.light,border:`1px solid ${stage.border}`,borderRadius:10,padding:"8px 8px 4px",minHeight:50}}>
          {sl.length===0?<div style={{textAlign:"center",padding:"16px 0",color:"#D1D5DB",fontSize:11}}>No deals</div>:sl.map(lead=><KanbanCard key={lead.id} lead={lead} onEdit={onEdit} onMove={onMove}/>)}
        </div>
      </div>;
    })}
  </div>;
}
function KanbanCard({lead,onEdit,onMove}){
  const stage=STAGES.find(s=>s.id===lead.stage),idx=STAGES.findIndex(s=>s.id===lead.stage),stale=isStale(lead);
  return <div onClick={()=>onEdit(lead)} style={{background:"#fff",border:stale?"1px solid #FECACA":"1px solid #E5E7EB",borderRadius:8,padding:"10px 10px 8px",marginBottom:7,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,0.09)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
      <div style={{width:26,height:26,borderRadius:6,background:repColor(lead.company),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{initials(lead.company)}</div>
      <div style={{minWidth:0,flex:1}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{fontWeight:600,fontSize:12,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lead.company}</div>{stale&&<span style={{width:6,height:6,borderRadius:"50%",background:"#EF4444",flexShrink:0}}/>}</div><div style={{fontSize:10,color:"#9CA3AF"}}>{lead.contact}</div></div>
    </div>
    {lead.value?<div style={{fontSize:13,fontWeight:700,color:stage.color,marginBottom:3}}>{fmt(lead.value)}</div>:null}
    {lead.rep&&<div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}><div style={{width:14,height:14,borderRadius:"50%",background:repColor(lead.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,fontWeight:700,color:"#fff"}}>{initials(lead.rep)}</div><span style={{fontSize:10,color:"#6B7280"}}>{lead.rep.split(" ")[0]}</span></div>}
    <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
      {idx>0&&!["signed","lost"].includes(lead.stage)&&<button onClick={()=>onMove(lead,"back")} style={{fontSize:9,padding:"2px 6px",border:"1px solid #E5E7EB",borderRadius:4,background:"#fff",color:"#6B7280",cursor:"pointer"}}>←</button>}
      {idx<3&&<button onClick={()=>onMove(lead,"forward")} style={{fontSize:9,padding:"2px 6px",border:`1px solid ${stage.color}`,borderRadius:4,background:stage.light,color:stage.color,fontWeight:600,cursor:"pointer"}}>→</button>}
      {idx===2&&<button onClick={()=>onMove(lead,"lost")} style={{fontSize:9,padding:"2px 6px",border:"1px solid #E5E7EB",borderRadius:4,background:"#fff",color:"#9CA3AF",cursor:"pointer"}}>Lost</button>}
    </div>
  </div>;
}

// ── Team View ────────────────────────────────────────────────────────────────
function TeamView({leads}){
  const stats=REPS.map(rep=>{
    const rl=leads.filter(l=>l.rep===rep),closed=rl.filter(l=>["signed","lost"].includes(l.stage)).length;
    const target=REP_TARGETS[rep]||0,revenue=rl.filter(l=>l.stage==="signed").reduce((s,l)=>s+(l.value||0),0);
    return {rep,lead:rl.filter(l=>l.stage==="lead").length,warm:rl.filter(l=>l.stage==="warm").length,hot:rl.filter(l=>l.stage==="hot").length,
      revenue,pipeline:rl.filter(l=>!["signed","lost"].includes(l.stage)).reduce((s,l)=>s+(l.value||0),0),
      winRate:closed?Math.round(rl.filter(l=>l.stage==="signed").length/closed*100):0,
      target,attainment:target?Math.min(Math.round(revenue/target*100),100):0,
      forecast:wForecast(rl),stale:rl.filter(l=>isStale(l)).length};
  }).sort((a,b)=>b.revenue-a.revenue);
  const orgTarget=REPS.reduce((s,r)=>s+(REP_TARGETS[r]||0),0);
  const orgRevenue=stats.reduce((s,r)=>s+r.revenue,0),orgForecast=stats.reduce((s,r)=>s+r.forecast,0);
  const orgPct=orgTarget?Math.round(orgRevenue/orgTarget*100):0;
  const totalStale=stats.reduce((s,r)=>s+r.stale,0);
  return <div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}><StatCard label="Monthly Target" value={fmt(orgTarget)} color="#6B7280"/><StatCard label="Signed So Far" value={fmt(orgRevenue)} color="#059669"/><StatCard label="Weighted Forecast" value={fmt(orgForecast)} color="#8B5CF6"/><StatCard label="Stale Deals" value={totalStale} color={totalStale>0?"#DC2626":"#9CA3AF"}/></div>
    <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"14px 18px",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:"#374151"}}>Org Quota Attainment</div><div style={{fontSize:13,fontWeight:800,color:orgPct>=100?"#059669":"#111827"}}>{orgPct}%</div></div><div style={{background:"#F3F4F6",borderRadius:6,height:10,overflow:"hidden"}}><div style={{width:`${Math.min(orgPct,100)}%`,height:"100%",background:orgPct>=100?"#059669":orgPct>=60?"#3B82F6":"#F59E0B",borderRadius:6}}/></div></div>
    <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"16px 18px",marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:12}}>Quota by Rep</div>
      {stats.map(r=><div key={r.rep} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:20,height:20,borderRadius:"50%",background:repColor(r.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>{initials(r.rep)}</div><span style={{fontSize:12,fontWeight:600,color:"#111827"}}>{r.rep}</span>{r.stale>0&&<span style={{fontSize:9,fontWeight:700,color:"#DC2626",background:"#FEF2F2",padding:"1px 6px",borderRadius:4}}>{r.stale} stale</span>}</div><div style={{fontSize:11,color:"#6B7280"}}>{fmt(r.revenue)} / {fmt(r.target)} <span style={{fontWeight:700,color:r.attainment>=100?"#059669":"#374151"}}>({r.attainment}%)</span></div></div><div style={{background:"#F3F4F6",borderRadius:5,height:7}}><div style={{width:`${r.attainment}%`,height:"100%",background:r.attainment>=100?"#059669":r.attainment>=60?"#3B82F6":"#F59E0B",borderRadius:5}}/></div></div>)}
    </div>
    <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 46px 46px 46px 90px 90px 50px",background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",gap:4}}>
        {["Rep","Lead","Warm","Hot","Signed","Pipeline","Win%"].map(h=><div key={h} style={{fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.05em",textAlign:h==="Rep"?"left":"center"}}>{h}</div>)}
      </div>
      {stats.map((r,i)=><div key={r.rep} style={{display:"grid",gridTemplateColumns:"1fr 46px 46px 46px 90px 90px 50px",padding:"12px 16px",borderBottom:i<stats.length-1?"1px solid #F3F4F6":"none",alignItems:"center",gap:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:repColor(r.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{initials(r.rep)}</div><span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{r.rep}</span></div>
        <div style={{textAlign:"center",fontSize:14,fontWeight:600,color:r.lead>0?"#6B7280":"#E5E7EB"}}>{r.lead}</div>
        <div style={{textAlign:"center",fontSize:14,fontWeight:600,color:r.warm>0?"#D97706":"#E5E7EB"}}>{r.warm}</div>
        <div style={{textAlign:"center",fontSize:14,fontWeight:600,color:r.hot>0?"#DC2626":"#E5E7EB"}}>{r.hot}</div>
        <div style={{textAlign:"center",fontSize:13,fontWeight:700,color:r.revenue>0?"#059669":"#D1D5DB"}}>{r.revenue>0?fmt(r.revenue):"—"}</div>
        <div style={{textAlign:"center",fontSize:12,color:r.pipeline>0?"#3B82F6":"#D1D5DB"}}>{r.pipeline>0?fmt(r.pipeline):"—"}</div>
        <div style={{textAlign:"center"}}><span style={{fontSize:12,fontWeight:700,color:r.winRate>=50?"#059669":r.winRate>0?"#D97706":"#D1D5DB"}}>{r.winRate}%</span></div>
      </div>)}
    </div>
  </div>;
}

// ── Tasks View ───────────────────────────────────────────────────────────────
function TasksView({tasks,leads,repFilter,onToggle,onAdd}){
  const [showAdd,setShowAdd]=useState(false),[newTitle,setNewTitle]=useState(""),[newLeadId,setNewLeadId]=useState(""),[newDue,setNewDue]=useState("");
  const scoped=repFilter==="org"?tasks:tasks.filter(t=>t.rep===repFilter);
  const pending=scoped.filter(t=>!t.done).sort((a,b)=>a.dueAt-b.dueAt),done=scoped.filter(t=>t.done);
  const overdueCount=pending.filter(t=>Math.ceil((t.dueAt-NOW)/DAY)<0).length,todayCount=pending.filter(t=>Math.ceil((t.dueAt-NOW)/DAY)===0).length;
  function handleAdd(){if(!newTitle.trim()||!newLeadId||!newDue)return;const lead=leads.find(l=>l.id===newLeadId);onAdd({id:crypto.randomUUID(),leadId:newLeadId,leadCompany:lead?lead.company:"",rep:lead?lead.rep:"",title:newTitle.trim(),dueAt:new Date(newDue).getTime(),done:false});setNewTitle("");setNewLeadId("");setNewDue("");setShowAdd(false);}
  return <div style={{maxWidth:640,margin:"0 auto"}}>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}><StatCard label="Overdue" value={overdueCount} color="#DC2626"/><StatCard label="Due Today" value={todayCount} color="#D97706"/><StatCard label="Open" value={pending.length} color="#3B82F6"/><StatCard label="Completed" value={done.length} color="#059669"/></div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><button onClick={()=>setShowAdd(s=>!s)} style={{padding:"7px 14px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{showAdd?"Cancel":"+ New Task"}</button></div>
    {showAdd&&<div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
      <Field label="Task"><input style={iS} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="e.g. Call back about pricing"/></Field>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Field label="Lead"><select style={iS} value={newLeadId} onChange={e=>setNewLeadId(e.target.value)}><option value="">Select a lead…</option>{leads.map(l=><option key={l.id} value={l.id}>{l.company}</option>)}</select></Field></div><div style={{flex:1}}><Field label="Due date"><input style={iS} type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}/></Field></div></div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={handleAdd} style={{padding:"8px 16px",borderRadius:7,border:"none",background:"#3B82F6",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Add Task</button></div>
    </div>}
    <div style={{marginBottom:18}}><div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:8}}>Open ({pending.length})</div>
      {pending.length===0?<div style={{textAlign:"center",padding:"24px 0",color:"#9CA3AF",fontSize:12}}>Nothing outstanding.</div>:pending.map(t=>{const due=dueLabel(t.dueAt);return <div key={t.id} style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:7}}><button onClick={()=>onToggle(t.id)} style={{width:18,height:18,borderRadius:5,border:"2px solid #D1D5DB",background:"#fff",cursor:"pointer",flexShrink:0,padding:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t.title}</div><div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{t.leadCompany}{t.rep?` · ${t.rep}`:""}</div></div><div style={{fontSize:11,fontWeight:700,color:due.color,flexShrink:0,whiteSpace:"nowrap"}}>{due.text}</div></div>;})}
    </div>
    {done.length>0&&<div><div style={{fontSize:12,fontWeight:700,color:"#9CA3AF",marginBottom:8}}>Completed ({done.length})</div>{done.map(t=><div key={t.id} style={{background:"#F9FAFB",border:"1px solid #F3F4F6",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,opacity:0.7,marginBottom:6}}><button onClick={()=>onToggle(t.id)} style={{width:18,height:18,borderRadius:5,border:"2px solid #059669",background:"#059669",cursor:"pointer",flexShrink:0,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span></button><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#6B7280",textDecoration:"line-through"}}>{t.title}</div><div style={{fontSize:11,color:"#9CA3AF"}}>{t.leadCompany}</div></div></div>)}</div>}
  </div>;
}

// ── Upload View ──────────────────────────────────────────────────────────────
function UploadLeads({onImport}){
  const [dragOver,setDragOver]=useState(false),[fileName,setFileName]=useState(null),[parsing,setParsing]=useState(false),[result,setResult]=useState(null),[imported,setImported]=useState(false);
  const fileRef=React.useRef(null);
  async function handleFile(file){if(!file)return;setFileName(file.name);setParsing(true);setResult(null);setImported(false);try{const text=await file.text();const rows=parseCSV(text);setResult(mapRowsToLeads(rows));}catch{setResult({leads:[],errors:["Couldn't read that file. Please use .csv format."],warnings:[]});}setParsing(false);}
  function reset(){setFileName(null);setResult(null);setImported(false);if(fileRef.current)fileRef.current.value="";}
  function handleImport(){if(!result||!result.leads.length)return;onImport(result.leads);setImported(true);}
  return <div style={{maxWidth:720,margin:"0 auto"}}>
    <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"18px 20px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12,flexWrap:"wrap"}}>
        <div><div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:3}}>Expected column format</div><div style={{fontSize:12,color:"#9CA3AF"}}>Upload a .csv file with these columns. Order doesn't matter.</div></div>
        <button onClick={downloadCSVTemplate} style={{padding:"8px 14px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>⬇ Download Template</button>
      </div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}><thead><tr>{["Column","Required","Example","Notes"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",fontSize:10,borderBottom:"1px solid #E5E7EB",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{CSV_COLS.map(c=><tr key={c.key}><td style={{padding:"7px 10px",fontWeight:600,color:"#111827",borderBottom:"1px solid #F3F4F6",whiteSpace:"nowrap"}}>{c.header}</td><td style={{padding:"7px 10px",borderBottom:"1px solid #F3F4F6"}}>{c.required?<span style={{color:"#DC2626",fontWeight:700,fontSize:10}}>Required</span>:<span style={{color:"#9CA3AF",fontSize:10}}>Optional</span>}</td><td style={{padding:"7px 10px",color:"#6B7280",borderBottom:"1px solid #F3F4F6",whiteSpace:"nowrap"}}>{c.example||"—"}</td><td style={{padding:"7px 10px",color:"#9CA3AF",borderBottom:"1px solid #F3F4F6"}}>{c.note}</td></tr>)}</tbody></table></div>
      <div style={{marginTop:10,background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"8px 12px",fontSize:11.5,color:"#92400E"}}>Deal Value is required once a row's Stage is Warm Lead or later.</div>
    </div>
    {!result&&<div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files?.[0]);}} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?"#3B82F6":"#D1D5DB"}`,background:dragOver?"#EFF6FF":"#fff",borderRadius:12,padding:"36px 20px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}><input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0])}/><div style={{fontSize:26,marginBottom:6}}>📄</div>{parsing?<div style={{fontSize:13,color:"#6B7280"}}>Reading {fileName}…</div>:<><div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:4}}>Drop your CSV here</div><div style={{fontSize:12,color:"#9CA3AF"}}>or click to browse · .csv only</div></>}</div>}
    {result&&result.errors&&result.errors.length>0&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,padding:"16px 18px"}}><div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:8}}>Couldn't import this file</div>{result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:"#991B1B",marginBottom:4}}>{e}</div>)}<button onClick={reset} style={{marginTop:10,padding:"7px 14px",borderRadius:7,border:"1px solid #FECACA",background:"#fff",color:"#DC2626",fontSize:12,fontWeight:600,cursor:"pointer"}}>Try another file</button></div>}
    {result&&(!result.errors||!result.errors.length)&&!imported&&<div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"16px 18px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}><div style={{fontSize:13,fontWeight:700,color:"#111827"}}>Found {result.leads.length} lead{result.leads.length!==1?"s":""} in {fileName}</div><button onClick={reset} style={{fontSize:11,color:"#6B7280",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Choose different file</button></div>
      {result.warnings&&result.warnings.length>0&&<div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 12px",marginBottom:10,maxHeight:120,overflowY:"auto"}}><div style={{fontSize:11,fontWeight:700,color:"#92400E",marginBottom:4}}>{result.warnings.length} thing{result.warnings.length!==1?"s":""} to check</div>{result.warnings.map((w,i)=><div key={i} style={{fontSize:11,color:"#92400E",marginBottom:2}}>{w}</div>)}</div>}
      <div style={{overflowX:"auto",marginBottom:12,maxHeight:240,overflowY:"auto",border:"1px solid #F3F4F6",borderRadius:8}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}><thead><tr style={{background:"#F9FAFB"}}>{["Company","Contact","Stage","Value","Rep"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 10px",color:"#9CA3AF",fontWeight:700,fontSize:10,textTransform:"uppercase",borderBottom:"1px solid #E5E7EB"}}>{h}</th>)}</tr></thead><tbody>{result.leads.map(l=>{const st=STAGES.find(s=>s.id===l.stage);return <tr key={l.id}><td style={{padding:"6px 10px",fontWeight:600,color:"#111827"}}>{l.company}</td><td style={{padding:"6px 10px",color:"#6B7280"}}>{l.contact}</td><td style={{padding:"6px 10px"}}><span style={{color:st.color,fontWeight:600,fontSize:10.5}}>{st.label}</span></td><td style={{padding:"6px 10px",color:"#374151"}}>{fmt(l.value)}</td><td style={{padding:"6px 10px",color:"#6B7280"}}>{l.rep||"—"}</td></tr>;})}</tbody></table></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={reset} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #E5E7EB",background:"#fff",color:"#6B7280",fontSize:12,cursor:"pointer"}}>Cancel</button><button onClick={handleImport} disabled={!result.leads.length} style={{padding:"8px 18px",borderRadius:7,border:"none",background:result.leads.length?"#111827":"#D1D5DB",color:"#fff",fontSize:12,fontWeight:700,cursor:result.leads.length?"pointer":"default"}}>Import {result.leads.length} Lead{result.leads.length!==1?"s":""}</button></div>
    </div>}
    {imported&&<div style={{background:"#F0FDF4",border:"1px solid #A7F3D0",borderRadius:12,padding:"20px",textAlign:"center"}}><div style={{fontSize:22,marginBottom:6}}>✓</div><div style={{fontSize:14,fontWeight:700,color:"#059669",marginBottom:4}}>{result.leads.length} lead{result.leads.length!==1?"s":""} imported</div><div style={{fontSize:12,color:"#6B7280",marginBottom:12}}>They're now on your Funnel and Pipeline.</div><button onClick={reset} style={{padding:"8px 16px",borderRadius:7,border:"1px solid #A7F3D0",background:"#fff",color:"#059669",fontSize:12,fontWeight:600,cursor:"pointer"}}>Upload another file</button></div>}
  </div>;
}

// ── Lead Modal ───────────────────────────────────────────────────────────────
function LeadModal({lead,onClose,onSave,onDelete,isNew}){
  const [form,setForm]=useState({...lead,activities:lead.activities||[]});
  const [aType,setAType]=useState("Call"),[aNote,setANote]=useState("");
  const needsValue=["warm","hot","signed","lost"].includes(form.stage);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  function handleSave(){if(!form.company.trim()){alert("Company name required.");return;}if(!form.contact.trim()){alert("Contact name required.");return;}if(needsValue&&!form.value){alert("Deal value required at this stage.");return;}onSave({...form,lostReason:form.stage==="lost"?form.lostReason:null});}
  function logActivity(){if(!aNote.trim())return;const a={id:crypto.randomUUID(),type:aType,note:aNote.trim(),at:Date.now()};setForm(f=>({...f,activities:[a,...(f.activities||[])],lastContactedAt:Date.now()}));setANote("");}
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontSize:16,fontWeight:700,color:"#111827"}}>{isNew?"Add Lead":"Edit Lead"}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,color:"#9CA3AF",cursor:"pointer"}}>✕</button></div>
      <Field label="Company *"><input style={iS} value={form.company} onChange={e=>set("company",e.target.value)} placeholder="e.g. Apex Digital"/></Field>
      <Field label="Contact Name *"><input style={iS} value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="e.g. Sarah Mitchell"/></Field>
      <Field label="Assigned Rep"><select style={iS} value={form.rep||""} onChange={e=>set("rep",e.target.value)}><option value="">Unassigned</option>{REPS.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Field label="Email"><input style={iS} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@co.com" type="email"/></Field></div><div style={{flex:1}}><Field label="Phone"><input style={iS} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="07700…"/></Field></div></div>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><Field label="Source"><select style={iS} value={form.source} onChange={e=>set("source",e.target.value)}>{LEAD_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select></Field></div><div style={{flex:1}}><Field label="Stage"><select style={iS} value={form.stage} onChange={e=>set("stage",e.target.value)}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></Field></div></div>
      {needsValue&&<Field label={`Deal Value (£)${form.stage!=="lead"?" *":""}`}><input style={iS} value={form.value||""} onChange={e=>set("value",e.target.value?Number(e.target.value):null)} placeholder="e.g. 12500" type="number" min="0"/></Field>}
      {form.stage==="lost"&&<Field label="Lost Reason"><select style={iS} value={form.lostReason||""} onChange={e=>set("lostReason",e.target.value)}><option value="">Select…</option>{LOST_REASONS.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>}
      <Field label="Notes"><textarea style={{...iS,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} placeholder="Next steps, context…"/></Field>
      {!isNew&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #F3F4F6"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:"#374151"}}>Activity Log</div>{form.lastContactedAt&&<div style={{fontSize:11,color:"#9CA3AF"}}>Last: {daysAgo(form.lastContactedAt)}</div>}</div>
        <div style={{display:"flex",gap:6,marginBottom:8}}><select value={aType} onChange={e=>setAType(e.target.value)} style={{...iS,width:80,flexShrink:0}}>{ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select><input value={aNote} onChange={e=>setANote(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();logActivity();}}} placeholder="What happened?" style={iS}/><button onClick={logActivity} style={{padding:"8px 12px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Log</button></div>
        {!(form.activities||[]).length?<div style={{fontSize:11,color:"#9CA3AF",textAlign:"center",padding:"8px 0"}}>No activity logged yet.</div>:<div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>{(form.activities||[]).map(a=><div key={a.id} style={{display:"flex",gap:8,fontSize:12}}><span style={{fontWeight:700,color:"#6B7280",flexShrink:0,width:50}}>{a.type}</span><span style={{color:"#374151",flex:1}}>{a.note}</span><span style={{color:"#D1D5DB",flexShrink:0,fontSize:11}}>{daysAgo(a.at)}</span></div>)}</div>}
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
        {!isNew?<button onClick={()=>{if(window.confirm("Delete this lead?"))onDelete(form.id);}} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #FECACA",background:"#FEF2F2",color:"#DC2626",fontSize:12,fontWeight:600,cursor:"pointer"}}>Delete</button>:<span/>}
        <div style={{display:"flex",gap:8}}><button onClick={onClose} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #E5E7EB",background:"#fff",color:"#6B7280",fontSize:12,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} style={{padding:"8px 18px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save Lead</button></div>
      </div>
    </div>
  </div>;
}

// ── Lost Modal ───────────────────────────────────────────────────────────────
function LostModal({onConfirm,onClose}){
  const [reason,setReason]=useState("");
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:14,padding:24,maxWidth:340,width:"100%"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:6}}>Why was this deal lost?</div>
      <div style={{fontSize:12,color:"#6B7280",marginBottom:12}}>Tracking reasons helps you spot patterns.</div>
      <select style={{...iS,marginBottom:14}} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Select a reason…</option>{LOST_REASONS.map(r=><option key={r} value={r}>{r}</option>)}</select>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={onClose} style={{padding:"7px 14px",border:"1px solid #E5E7EB",borderRadius:7,background:"#fff",color:"#6B7280",fontSize:12,cursor:"pointer"}}>Cancel</button><button onClick={()=>onConfirm(reason)} style={{padding:"7px 16px",border:"none",borderRadius:7,background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Confirm Lost</button></div>
    </div>
  </div>;
}

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [step,setStep]=useState("role"),[hovered,setHovered]=useState(null);
  return <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
    <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:44}}><div style={{width:32,height:32,background:"#3B82F6",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 13 L4 7.5 L7 9.5 L13 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></div><span style={{color:"#fff",fontWeight:800,fontSize:18,letterSpacing:"-0.03em"}}>PipelineHQ</span></div>
    <div style={{width:"100%",maxWidth:420}}>
      {step==="role"&&<><div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>Welcome back</div><div style={{fontSize:13,color:"#6B7280"}}>How are you logging in today?</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[{role:"manager",icon:"🏢",title:"Manager",desc:"Full dashboard — team pipeline, targets, forecast & all reps",color:"#3B82F6"},{role:"rep",icon:"👤",title:"Sales Rep",desc:"Your deals, your tasks, your quota only",color:"#10B981"}].map(opt=><button key={opt.role} onClick={()=>opt.role==="manager"?onLogin({role:"manager",name:"Manager",rep:null}):setStep("rep")} onMouseEnter={()=>setHovered(opt.role)} onMouseLeave={()=>setHovered(null)} style={{width:"100%",padding:"18px 20px",border:`1.5px solid ${hovered===opt.role?opt.color:"#1F2937"}`,borderRadius:14,background:hovered===opt.role?"#1A2736":"#141F2B",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all 0.15s",textAlign:"left"}}><div style={{width:42,height:42,borderRadius:12,background:`${opt.color}22`,border:`1px solid ${opt.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{opt.icon}</div><div><div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:2}}>{opt.title}</div><div style={{fontSize:12,color:"#6B7280",lineHeight:1.4}}>{opt.desc}</div></div><div style={{marginLeft:"auto",color:"#374151",fontSize:16}}>›</div></button>)}
        </div></>}
      {step==="rep"&&<><div style={{textAlign:"center",marginBottom:24}}><button onClick={()=>setStep("role")} style={{background:"none",border:"none",color:"#6B7280",fontSize:12,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:4,margin:"0 auto 12px"}}>← Back</button><div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>Who are you?</div><div style={{fontSize:13,color:"#6B7280"}}>Select your name to continue</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>{REPS.map(rep=><button key={rep} onClick={()=>onLogin({role:"rep",name:rep,rep})} onMouseEnter={()=>setHovered(rep)} onMouseLeave={()=>setHovered(null)} style={{width:"100%",padding:"13px 18px",border:`1.5px solid ${hovered===rep?repColor(rep):"#1F2937"}`,borderRadius:12,background:hovered===rep?"#1A2736":"#141F2B",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"}}><div style={{width:34,height:34,borderRadius:"50%",background:repColor(rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(rep)}</div><span style={{fontSize:14,fontWeight:600,color:"#fff"}}>{rep}</span><div style={{marginLeft:"auto",color:"#374151",fontSize:16}}>›</div></button>)}</div></>}
      <div style={{textAlign:"center",marginTop:28,fontSize:11,color:"#374151"}}>Demo mode · Data stored in your browser</div>
    </div>
  </div>;
}

// ── Shared header builder ────────────────────────────────────────────────────
function AppHeader({tabs,activeTab,setTab,tasks,search,setSearch,onAdd,onLogout,session}){
  return <div style={{background:"#111827",height:52,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}><Logo/><NavTabs tabs={tabs} active={activeTab} onSelect={setTab} tasks={tasks}/></div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{padding:"5px 10px",borderRadius:6,border:"1px solid #374151",background:"#1F2937",color:"#F9FAFB",fontSize:12,outline:"none",width:120}}/>
      <button onClick={onAdd} style={{padding:"6px 12px",borderRadius:6,border:"none",background:"#3B82F6",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Lead</button>
      <div style={{display:"flex",alignItems:"center",gap:7,paddingLeft:10,borderLeft:"1px solid #1F2937"}}>
        {session.role==="rep"?<div style={{width:26,height:26,borderRadius:"50%",background:repColor(session.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{initials(session.rep)}</div>:<div style={{width:26,height:26,borderRadius:8,background:"#374151",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🏢</div>}
        <button onClick={onLogout} style={{fontSize:11,color:"#6B7280",background:"none",border:"none",cursor:"pointer"}}>Sign out</button>
      </div>
    </div>
  </div>;
}

// ── Funnel body (shared) ─────────────────────────────────────────────────────
function FunnelBody({leads,onEdit,onMove}){
  const [activeStage,setActiveStage]=useState(null);
  const toggle=id=>setActiveStage(p=>p===id?null:id);
  return <>
    <VisualFunnel leads={leads} onStageClick={toggle} activeStage={activeStage}/>
    {activeStage&&<div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{fontSize:12,fontWeight:700,color:STAGES.find(s=>s.id===activeStage)?.color,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:STAGES.find(s=>s.id===activeStage)?.color}}/>{STAGES.find(s=>s.id===activeStage)?.label} — {leads.filter(l=>l.stage===activeStage).length} deals</div>
      {leads.filter(l=>l.stage===activeStage).length===0?<div style={{textAlign:"center",padding:"28px 0",color:"#9CA3AF",fontSize:13}}>No deals here.</div>:leads.filter(l=>l.stage===activeStage).map(lead=><LeadRow key={lead.id} lead={lead} onEdit={onEdit} onMove={onMove}/>)}
    </div>}
  </>;
}

// ── Rep Dashboard ────────────────────────────────────────────────────────────
function RepDashboard({session,leads,tasks,onEdit,onMove,onOpenAdd,onToggleTask,onAddTask,onLogout}){
  const [tab,setTab]=useState("funnel"),[search,setSearch]=useState("");
  const myLeads=leads.filter(l=>l.rep===session.rep);
  const myTasks=tasks.filter(t=>t.rep===session.rep);
  const myFiltered=!search.trim()?myLeads:myLeads.filter(l=>l.company.toLowerCase().includes(search.toLowerCase())||l.contact.toLowerCase().includes(search.toLowerCase()));
  const target=REP_TARGETS[session.rep]||0,signed=myLeads.filter(l=>l.stage==="signed").reduce((s,l)=>s+(l.value||0),0);
  const pipeline=myLeads.filter(l=>!["signed","lost"].includes(l.stage)).reduce((s,l)=>s+(l.value||0),0);
  const staleCount=myLeads.filter(l=>isStale(l)).length;
  return <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:"#F8FAFC",minHeight:"100vh"}}>
    <AppHeader tabs={["funnel","pipeline","tasks"]} activeTab={tab} setTab={setTab} tasks={myTasks} search={search} setSearch={setSearch} onAdd={()=>onOpenAdd(session.rep)} onLogout={onLogout} session={session}/>
    <div style={{padding:"18px 18px 40px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:38,height:38,borderRadius:"50%",background:repColor(session.rep),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>{initials(session.rep)}</div><div><div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{session.rep}</div><div style={{fontSize:11,color:"#9CA3AF"}}>{myLeads.filter(l=>!["signed","lost"].includes(l.stage)).length} active · {myLeads.filter(l=>l.stage==="signed").length} signed</div></div></div>
        {staleCount>0&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#DC2626",fontWeight:600}}>⚠️ {staleCount} deal{staleCount>1?"s":""} need contact</div>}
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}><StatCard label="My Pipeline" value={fmt(pipeline)} color="#3B82F6"/><StatCard label="Signed" value={fmt(signed)} color="#059669"/><StatCard label="Forecast" value={fmt(Math.round(wForecast(myLeads)))} color="#8B5CF6"/><StatCard label="Quota" value={`${target?Math.min(Math.round(signed/target*100),100):0}%`} color="#F59E0B"/></div>
      <QuotaBar signed={signed} target={target}/>
      {tab==="funnel"&&<FunnelBody leads={myFiltered} onEdit={onEdit} onMove={onMove}/>}
      {tab==="pipeline"&&<KanbanBoard leads={myFiltered} onEdit={onEdit} onMove={onMove}/>}
      {tab==="tasks"&&<TasksView tasks={myTasks} leads={myLeads} repFilter={session.rep} onToggle={onToggleTask} onAdd={onAddTask}/>}
    </div>
  </div>;
}

// ── Manager Dashboard ────────────────────────────────────────────────────────
function ManagerDashboard({session,leads,tasks,onEdit,onMove,onOpenAdd,onToggleTask,onAddTask,onImport,onLogout}){
  const [tab,setTab]=useState("funnel"),[repFilter,setRepFilter]=useState("org"),[search,setSearch]=useState("");
  const byRep=repFilter==="org"?leads:leads.filter(l=>l.rep===repFilter);
  const filtered=!search.trim()?byRep:byRep.filter(l=>l.company.toLowerCase().includes(search.toLowerCase())||l.contact.toLowerCase().includes(search.toLowerCase()));
  return <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:"#F8FAFC",minHeight:"100vh"}}>
    <AppHeader tabs={["funnel","pipeline","team","tasks","upload"]} activeTab={tab} setTab={setTab} tasks={tasks} search={search} setSearch={setSearch} onAdd={()=>onOpenAdd("")} onLogout={onLogout} session={session}/>
    {tab!=="upload"&&tab!=="tasks"&&<RepOrgTabs repFilter={repFilter} setRepFilter={setRepFilter}/>}
    <div style={{padding:"18px 18px 40px"}}>
      <div style={{marginBottom:12}}>
        {tab==="upload"?<div style={{fontSize:15,fontWeight:800,color:"#111827"}}>Upload Leads</div>
        :tab==="tasks"?<div><div style={{fontSize:15,fontWeight:800,color:"#111827"}}>Tasks & Follow-ups</div><div style={{fontSize:11,color:"#9CA3AF"}}>{tasks.filter(t=>!t.done).length} open · {tasks.filter(t=>!t.done&&Math.ceil((t.dueAt-NOW)/DAY)<0).length} overdue across the team</div></div>
        :repFilter==="org"?<div style={{fontSize:15,fontWeight:800,color:"#111827"}}>Organisation Overview <span style={{fontSize:12,fontWeight:400,color:"#9CA3AF"}}>· {filtered.length} deals</span></div>
        :<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:repColor(repFilter),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{initials(repFilter)}</div><div><div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{repFilter}</div><div style={{fontSize:11,color:"#9CA3AF"}}>{filtered.length} deals</div></div></div>}
      </div>
      {tab==="funnel"&&<FunnelBody leads={filtered} onEdit={onEdit} onMove={onMove}/>}
      {tab==="pipeline"&&<KanbanBoard leads={filtered} onEdit={onEdit} onMove={onMove}/>}
      {tab==="team"&&<TeamView leads={leads}/>}
      {tab==="tasks"&&<TasksView tasks={tasks} leads={leads} repFilter="org" onToggle={onToggleTask} onAdd={onAddTask}/>}
      {tab==="upload"&&<UploadLeads onImport={onImport}/>}
    </div>
  </div>;
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App(){
  const [leads,setLeads]=useState([]),[tasks,setTasks]=useState([]),[loaded,setLoaded]=useState(false),[session,setSession]=useState(null),[editLead,setEditLead]=useState(null),[isNew,setIsNew]=useState(false),[lostTarget,setLostTarget]=useState(null);

  useEffect(()=>{(async()=>{
    try{const r=await fetch(`${API}/api/leads`);setLeads(await r.json());}catch{setLeads(DEMO_LEADS);}
    try{const r=await fetch(`${API}/api/tasks`);setTasks(await r.json());}catch{setTasks(DEMO_TASKS);}
    try{const r=await window.storage.get(SESSION_KEY);if(r?.value)setSession(JSON.parse(r.value));}catch{}
    setLoaded(true);
  })();},[]);

const persist=async u=>{
  setLeads(u);
  try{
    await Promise.all(u.map(lead=>fetch(`${API}/api/leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(lead)})));
  }catch{}
};

  async function login(s){setSession(s);try{await window.storage.set(SESSION_KEY,JSON.stringify(s));}catch{}}
  async function logout(){setSession(null);try{await window.storage.delete(SESSION_KEY);}catch{}}

  function openAdd(rep){setEditLead({id:crypto.randomUUID(),company:"",contact:"",email:"",phone:"",source:"Referral",stage:"lead",value:null,notes:"",createdAt:Date.now(),lostReason:null,rep:rep||"",activities:[]});setIsNew(true);}
  function saveLead(l){persist(isNew?[...leads,l]:leads.map(x=>x.id===l.id?l:x));setEditLead(null);}
  function deleteLead(id){persist(leads.filter(l=>l.id!==id));setEditLead(null);}
  function importLeads(nl){persist([...leads,...nl]);}
  function toggleTask(id){persistT(tasks.map(t=>t.id===id?{...t,done:!t.done}:t));}
  function addTask(t){persistT([...tasks,t]);}

  function moveLead(lead,dir){
    const idx=STAGES.findIndex(s=>s.id===lead.stage);
    if(dir==="lost"){setLostTarget(lead);return;}
    const next=dir==="forward"?STAGES[idx+1]:STAGES[idx-1];
    if(!next)return;
    if(next.id==="lost"){setLostTarget(lead);return;}
    if(["warm","hot","signed"].includes(next.id)&&!lead.value){setEditLead({...lead,stage:next.id});setIsNew(false);return;}
    persist(leads.map(l=>l.id===lead.id?{...l,stage:next.id}:l));
  }
  function confirmLost(reason){persist(leads.map(l=>l.id===lostTarget.id?{...l,stage:"lost",lostReason:reason||null}:l));setLostTarget(null);}
  function editExisting(l){setEditLead(l);setIsNew(false);}

  if(!loaded)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#9CA3AF",fontSize:14}}>Loading…</div>;
  if(!session)return <LoginScreen onLogin={login}/>;

  const shared={leads,tasks,onEdit:editExisting,onMove:moveLead,onToggleTask:toggleTask,onAddTask:addTask,onLogout:logout};
  return <>
    {session.role==="manager"?<ManagerDashboard {...shared} session={session} onOpenAdd={openAdd} onImport={importLeads}/>:<RepDashboard {...shared} session={session} onOpenAdd={openAdd}/>}
    {editLead&&<LeadModal lead={editLead} onClose={()=>setEditLead(null)} onSave={saveLead} onDelete={deleteLead} isNew={isNew}/>}
    {lostTarget&&<LostModal onConfirm={confirmLost} onClose={()=>setLostTarget(null)}/>}
  </>;
}
