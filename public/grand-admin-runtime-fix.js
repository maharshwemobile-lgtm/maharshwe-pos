(function(){
  'use strict';
  function activePage(){
    var active=document.querySelector('.nav button.active');
    return active&&active.dataset?active.dataset.page:'dashboard';
  }
  function rerun(){
    try{
      var page=activePage();
      if(page==='dashboard'&&typeof window.loadDashboard==='function') window.loadDashboard();
      if(page==='subscriptions'&&typeof window.loadSubscriptions==='function') window.loadSubscriptions();
      if(page==='health'&&typeof window.loadHealth==='function') window.loadHealth();
    }catch(e){console.warn('grand admin runtime refresh failed',e)}
  }
  window.addEventListener('load',function(){setTimeout(rerun,900);setTimeout(rerun,2200)});
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav button')||e.target.closest('#refreshBtn')) setTimeout(rerun,700);
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(rerun,600)});
  setTimeout(rerun,1500);
})();
