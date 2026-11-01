export const STAGES = ['received', 'diagnosis', 'repair', 'ready', 'completed'];
export const STORAGE_KEY = 'tehnomerkez-demo-v1';
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function dayOffset(n, now = new Date()) {
  const d = new Date(now); d.setDate(d.getDate()+n); return localDay(d);
}
export function isOverdue(order, today = localDay()) {
  return !['ready','completed'].includes(order.status) && order.deadline < today;
}
export function seedData(now = new Date()) {
  const customers = [
    {id:'c1',name:'Merdan Amanow',phone:'+993 65 000001',email:'merdan@example.com'},
    {id:'c2',name:'Aýna Orazowa',phone:'+993 65 000002',email:'ayna@example.com'},
    {id:'c3',name:'Serdar Myradow',phone:'+993 65 000003',email:''},
    {id:'c4',name:'Leýli Annagulyýewa',phone:'+993 65 000004',email:'leyli@example.com'},
    {id:'c5',name:'Arslan Ataýew',phone:'+993 65 000005',email:''},
    {id:'c6',name:'Mähri Saparowa',phone:'+993 65 000006',email:'mahri@example.com'}
  ];
  const technicians = [
    {id:'t1',name:'Döwlet Rejepow',phone:'+993 65 000011',specialty:'Hardware / SSD'},
    {id:'t2',name:'Selbi Orazowa',phone:'+993 65 000012',specialty:'Apple / Displays'},
    {id:'t3',name:'Batyr Ataýew',phone:'+993 65 000013',specialty:'Windows / Networks'}
  ];
  const specs = [
    ['Lenovo ThinkPad T14','c1','t1','repair',380,1,'urgent','SSD / Windows',-3],
    ['MacBook Pro 14','c2','t2','diagnosis',650,2,'normal','Display',-2],
    ['HP Pavilion 15','c3','t1','ready',220,0,'normal','Battery',-4],
    ['ASUS VivoBook 16','c4','t3','received',150,3,'normal','Windows',0],
    ['Dell OptiPlex 7090','c5','t3','repair',290,-1,'urgent','Network / SSD',-5],
    ['Acer Aspire 5','c6','t1','diagnosis',180,1,'normal','Cooling',-1],
    ['Lenovo Legion 5','c1','t1','completed',450,-2,'normal','Cooling / SSD',-6],
    ['iMac 24','c2','t2','ready',320,0,'normal','macOS',-3],
    ['HP EliteBook 840','c4','t3','completed',250,-1,'normal','Windows / Drivers',-4],
    ['ASUS TUF Gaming','c5','t1','received',300,4,'normal','Keyboard',0]
  ];
  const orders=specs.map((s,i)=>{
    const [device,customer,technician,status,cost,deadline,priority,problem,created] = s;
    const history=STAGES.slice(0,STAGES.indexOf(status)+1).map((st,j)=>({status:st,date:dayOffset(created,now)+`T${String(9+j).padStart(2,'0')}:00:00`,note:'',cost,technician}));
    return {id:`TM-${1041+i}`,device,customer,technician,status,cost,deadline:dayOffset(deadline,now),priority,problem,serial:`DEMO-${2401+i}`,created:dayOffset(created,now)+'T09:00:00',updated:history.at(-1).date,token:`DEMO-${1041+i}`,history};
  });
  return {version:1,customers,technicians,orders};
}
export function validateOrder(data, state) {
  if (!state.customers.some(c=>c.id===data.customer)) throw Error('customerRequired');
  if (data.technician && !state.technicians.some(t=>t.id===data.technician)) throw Error('technicianRequired');
  if (typeof data.device!=='string'||data.device.trim().length<2||data.device.length>100) throw Error('invalidFields');
  if (typeof data.problem!=='string'||data.problem.trim().length<3||data.problem.length>2000) throw Error('invalidFields');
  if (!STAGES.includes(data.status)||!['normal','urgent'].includes(data.priority)) throw Error('invalidFields');
  if (!Number.isFinite(data.cost)||data.cost<0||data.cost>1000000) throw Error('invalidFields');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)||Number.isNaN(new Date(data.deadline).valueOf())||new Date(data.deadline).toISOString().slice(0,10)!==data.deadline) throw Error('invalidFields');
}
export function saveOrder(state, data, id, now = new Date()) {
  validateOrder(data,state);
  const old=id?state.orders.find(o=>o.id===id):null;
  if(id&&!old) throw Error('notFound');
  const num=Math.max(1040,...state.orders.map(o=>Number(o.id.slice(3))||0))+1;
  const record={...data,device:data.device.trim(),problem:data.problem.trim(),id:old?.id||`TM-${num}`,token:old?.token||crypto.randomUUID().split('-')[0].toUpperCase(),created:old?.created||now.toISOString(),updated:now.toISOString(),history:[...(old?.history||[]),{status:data.status,date:now.toISOString(),cost:data.cost,technician:data.technician,note:(data.note||'').trim()}]};
  delete record.note;
  return {...state,orders:old?state.orders.map(o=>o.id===id?record:o):[record,...state.orders]};
}
export function filterOrders(state, {query='',status='',from='',to='',overdue=false}={}) {
  const q=query.toLocaleLowerCase().trim();
  return state.orders.filter(o=>(!status||o.status===status)&&(!from||o.created.slice(0,10)>=from)&&(!to||o.created.slice(0,10)<=to)&&(!overdue||isOverdue(o))&&[o.id,o.device,state.customers.find(c=>c.id===o.customer)?.name,o.serial].join(' ').toLocaleLowerCase().includes(q)).sort((a,b)=>b.created.localeCompare(a.created)||b.id.localeCompare(a.id));
}
export function trackOrder(state,id,token) {
  const o=state.orders.find(o=>o.id===id.trim().toUpperCase()&&o.token===token.trim().toUpperCase());
  return o?{id:o.id,device:o.device,status:o.status,cost:o.cost,deadline:o.deadline}:null;
}
export function csvCell(value) {
  const raw=String(value??'');
  return '"'+(/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')+'"';
}
export function summary(orders) {
  return {active:orders.filter(o=>!['ready','completed'].includes(o.status)).length,ready:orders.filter(o=>o.status==='ready').length,completed:orders.filter(o=>o.status==='completed').length,total:orders.filter(o=>o.status==='completed').reduce((sum,o)=>sum+o.cost,0),overdue:orders.filter(o=>isOverdue(o)).length};
}
export function validState(s) {
  if(!s||s.version!==1||!['customers','technicians','orders'].every(k=>Array.isArray(s[k]))) return false;
  try {
    const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9-]{1,100}$/.test(v);
    const validDate=v=>typeof v==='string'&&Number.isFinite(new Date(v).valueOf());
    for(const k of ['customers','technicians','orders'])if(new Set(s[k].map(p=>p.id)).size!==s[k].length)return false;
    if(![...s.customers,...s.technicians].every(p=>safeId(p.id)&&typeof p.name==='string'&&p.name.trim().length>=2&&typeof p.phone==='string'&&(p.email===undefined||typeof p.email==='string')&&(p.specialty===undefined||typeof p.specialty==='string')))return false;
    for(const o of s.orders){
      validateOrder(o,s);
      if(!safeId(o.id)||!/^TM-\d+$/.test(o.id)||!validDate(o.created)||!validDate(o.updated)||!safeId(o.token)||typeof o.serial!=='string'||!Array.isArray(o.history))return false;
      if(!o.history.every(h=>STAGES.includes(h.status)&&validDate(h.date)&&Number.isFinite(h.cost)&&h.cost>=0&&typeof h.technician==='string'&&typeof h.note==='string'))return false;
    }
    return true;
  }catch{return false;}
}
