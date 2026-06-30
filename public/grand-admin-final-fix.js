(function(){
  'use strict';
  function $(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function arr(d,keys){for(var i=0;i<keys.length;i++){if(Array.isArray(d&&d[keys[i]]))return d[keys[i]]}return Array.isArray(d)?d:[]}
  function shopId(s){return s.id||s.shopId}
  function shopName(s){return s.name||s.shopName||s.businessName||'Unnamed Shop'}
  function tenantId(s){return s.code||s.tenantId||s.slug||s.id||'-'}
  function num(v){return Number(v||0).toLocaleString('en-US')}
  function money(v){return Number(v||0).toLocaleString('en-US')+' Ks'}
  function api(path,opts){return window.api(path,opts||{})}
  function badge(v){var s=String(v||'UNKNOWN').toLowerCase(),c='inactive'; if(['active','healthy','ok','online','connected','configured','true'].indexOf(s)>=0)c='active'; else if(['trial','pending','pending_setup','draft','pending_activation','degraded','warning','unknown'].indexOf(s)>=0)c='pending'; else if(['suspended','cancelled','canceled','overdue','past_due','deleted','offline','error','down','unhealthy','not_configured','false'].indexOf(s)>=0)c='suspended'; return '<span class="status '+c+'">'+esc(v)+'</span>'}
  async function fetchShops(){var d=await api('/api/grand-admin/shops?limit=250');return arr(d,['shops','rows','data'])}
  function planOf(s){return s.subscriptionPlan||s.plan||s.subscription?.plan||s.subscriptionStatus||'-'}
  function planBadge(v){var p=String(v||'-');return '<span class="status '+(p==='-'?'inactive':'active')+'">'+esc(p)+'</span>'}
  function confirmTyped(title,msg,key,fn){return window.confirmTyped(title,msg,key,fn)}
  function refreshSubs(){if(typeof window.loadSubscriptions==='function')setTimeout(window.loadSubscriptions,350);if(typeof window.loadDashboard==='function')setTimeout(window.loadDashboard,700)}
  async function renewWithPlan(id,name,days,label){
    var plan=label==='Custom'?'Custom':label;
    await api('/api/grand-admin/shops/'+id+'/subscription',{method:'PATCH',body:JSON.stringify({status:'ACTIVE',plan:plan,subscriptionPlan:plan,customDays:days,notes:'Plan changed to '+plan+' from Mahar POS Grand Admin UI'})});
    await api('/api/grand-admin/shops/'+id+'/subscription/renew',{method:'POST',body:JSON.stringify({days:days,plan:plan,subscriptionPlan:plan,customDays:days,notes:'Renewed '+plan+' from Mahar POS Grand Admin UI'})});
    refreshSubs();
  }
  window.GrandAdminPolish=window.GrandAdminPolish||{};
  window.GrandAdminPolish.renew=function(id,name,days,label){
    confirmTyped('Renew '+label,'Renew '+name+' for '+days+' days and set Plan to '+label+'?','RENEW',function(){return renewWithPlan(id,name,days,label)})
  };
  window.GrandAdminPolish.customRenew=function(id,name){
    var days=prompt('Custom days ထည့်ပါ','30'); if(!days)return; var n=Number(days); if(!Number.isFinite(n)||n<=0){alert('Invalid days');return}
    confirmTyped('Renew Custom','Renew '+name+' for '+n+' days and set Plan to Custom?','RENEW',function(){return renewWithPlan(id,name,n,'Custom')})
  };
  window.GrandAdminPolish.cancel=function(id,name){
    confirmTyped('Cancel Subscription','Cancel subscription for '+name+'?','CANCEL',function(){return api('/api/grand-admin/shops/'+id+'/subscription/cancel',{method:'POST',body:JSON.stringify({reason:'Cancelled from Mahar POS Grand Admin UI'})}).then(refreshSubs)})
  };
  window.loadSubscriptions=async function(){
    var body=$('subsBody'); if(!body)return; body.innerHTML='<tr><td colspan="6" class="muted">Loading...</td></tr>';
    try{var shops=await fetchShops(); var rows=await Promise.all(shops.map(async function(s){try{return{shop:s,sub:await api('/api/grand-admin/shops/'+shopId(s)+'/subscription')}}catch(e){return{shop:s,sub:{}}}}));
      body.innerHTML=rows.map(function(r){var s=r.shop,x=r.sub.subscription||r.sub.data||r.sub||{},id=shopId(s),name=shopName(s),plan=x.plan||x.subscriptionPlan||planOf(s); return '<tr><td><b>'+esc(name)+'</b><div class="muted">'+esc(tenantId(s))+'</div></td><td>'+planBadge(plan)+'</td><td>'+badge(x.status||x.legacyStatus||s.subscriptionStatus||'-')+'</td><td>'+esc(x.endsAt||x.subscriptionEndsAt||x.expiresAt||'-')+'</td><td>'+money(x.monthlyFee||0)+'</td><td><div class="renew-buttons"><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\''+esc(name)+'\',30,\'1M\')">1M</button><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\''+esc(name)+'\',90,\'3M\')">3M</button><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\''+esc(name)+'\',365,\'1Y\')">1Y</button><button class="btn warn" onclick="GrandAdminPolish.customRenew(\''+id+'\',\''+esc(name)+'\')">Custom</button><button class="btn primary" onclick="openSubscriptionModal(\''+id+'\')">Save</button><button class="btn danger" onclick="GrandAdminPolish.cancel(\''+id+'\',\''+esc(name)+'\')">Cancel</button></div></td></tr>'}).join('')||'<tr><td colspan="6" class="muted">No subscriptions</td></tr>';
    }catch(e){body.innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>'}
  };
  function normalizeServices(data){
    var root=data&&data.data||data&&data.result||data||{}, list=[];
    function objectDesc(o){var parts=[]; if(o.serviceType)parts.push('Type: '+o.serviceType); if(Object.prototype.hasOwnProperty.call(o,'configured'))parts.push(o.configured?'Configured':'Not configured'); if(o.message)parts.push(o.message); if(o.description)parts.push(o.description); return parts.join(' · ')||'Service status'}
    function add(name,val){
      if(val&&typeof val==='object'){
        var n=val.serviceName||val.name||val.service||name||'Service';
        var st=val.status||(val.ok===true?'OK':val.ok===false?'ERROR':undefined)||(val.healthy===true?'OK':val.healthy===false?'ERROR':undefined)||val.state||(val.configured===true?'CONFIGURED':val.configured===false?'NOT_CONFIGURED':'UNKNOWN');
        list.push({name:n,status:st,desc:objectDesc(val)});
      }else list.push({name:name||'Service',status:typeof val==='boolean'?(val?'OK':'ERROR'):(val||'UNKNOWN'),desc:String(val==null?'':val)});
    }
    if(Array.isArray(root))root.forEach(function(v,i){add('Service '+(i+1),v)});
    else if(Array.isArray(root.services))root.services.forEach(function(v,i){add('Service '+(i+1),v)});
    else if(root.services&&typeof root.services==='object')Object.keys(root.services).forEach(function(k){add(k,root.services[k])});
    else Object.keys(root).filter(function(k){return ['ok','message','status','timestamp','generatedAt'].indexOf(k)<0}).forEach(function(k){add(k,root[k])});
    if(!list.length)add('API Server',{serviceName:'API Server',serviceType:'api',status:root.status||'OK',configured:true,message:root.message||'Running'});
    return list;
  }
  function healthClass(status){var s=String(status||'').toLowerCase(); if(['ok','healthy','online','connected','configured','active'].indexOf(s)>=0)return 'ok'; if(['unknown','warning','degraded','pending'].indexOf(s)>=0)return 'warn'; return 'bad'}
  function healthCards(data){return normalizeServices(data).map(function(s){var c=healthClass(s.status),icon=c==='ok'?'✓':(c==='warn'?'!':'×'); return '<div class="health-card"><div class="health-icon '+c+'">'+icon+'</div><div><b>'+esc(s.name)+'</b><small>'+esc(s.desc)+'</small><div style="margin-top:8px">'+badge(s.status)+'</div></div></div>'}).join('')}
  window.loadHealth=async function(){
    try{var h=await api('/api/grand-admin/system-health'); $('healthGrid').className='health-cards'; $('healthGrid').innerHTML=healthCards(h); var i=await api('/api/grand-admin/integrations/status'); $('integrationGrid').className='health-cards'; $('integrationGrid').innerHTML=healthCards(i); if($('statHealth'))$('statHealth').textContent='OK'; if($('statHealthNote'))$('statHealthNote').textContent='Health cards loaded'}
    catch(e){if($('healthGrid'))$('healthGrid').innerHTML='<div class="health-card"><div class="health-icon bad">×</div><div><b>Error</b><small>'+esc(e.message)+'</small></div></div>'}
  };
  var oldOpenSub=window.openSubscriptionModal;
  window.openSubscriptionModal=async function(id){ if(oldOpenSub)await oldOpenSub(id); setTimeout(function(){var body=document.querySelector('#modalBody'); if(!body||body.querySelector('.sub-quick'))return; body.insertAdjacentHTML('afterbegin','<div class="sub-quick"><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\'selected shop\',30,\'1M\')">Renew 1M → Plan 1M</button><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\'selected shop\',90,\'3M\')">Renew 3M → Plan 3M</button><button class="btn success" onclick="GrandAdminPolish.renew(\''+id+'\',\'selected shop\',365,\'1Y\')">Renew 1Y → Plan 1Y</button><button class="btn warn" onclick="GrandAdminPolish.customRenew(\''+id+'\',\'selected shop\')">Custom Day → Plan Custom</button></div>')},50)};
  setTimeout(function(){try{if(typeof window.loadHealth==='function'&&document.querySelector('#panel-health.active'))window.loadHealth(); if(typeof window.loadSubscriptions==='function'&&document.querySelector('#panel-subscriptions.active'))window.loadSubscriptions()}catch(e){}},800);
})();
