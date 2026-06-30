(function(){
  'use strict';
  function $(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function arr(d,keys){for(var i=0;i<keys.length;i++){if(Array.isArray(d&&d[keys[i]]))return d[keys[i]]}return Array.isArray(d)?d:[]}
  function api(path,opts){return window.api(path,opts||{})}
  function badge(v){var s=String(v||'').toLowerCase(),c='inactive';if(['active','ok','enabled','password + google'].indexOf(s)>=0)c='active';else if(['pending_setup','pending','google allowed'].indexOf(s)>=0)c='pending';else if(['suspended','disabled'].indexOf(s)>=0)c='suspended';return '<span class="status '+c+'">'+esc(v)+'</span>'}
  function loginType(u){
    var googleLinked=Boolean(u.googleLinkAllowed||u.authProvider==='google'||u.provider==='google'||u.providerId==='linked'||u.loginType==='Google');
    return googleLinked?'Password + Google':'Password';
  }
  function userStatus(u){return u.status||(u.active===false?'SUSPENDED':'ACTIVE')}
  window.loadUsers=async function(){
    var tbody=$('usersBody'); if(!tbody)return;
    tbody.innerHTML='<tr><td colspan="6" class="muted">Loading...</td></tr>';
    try{
      var q='/api/grand-admin/users?limit=200';
      if($('roleFilter')&&$('roleFilter').value)q+='&role='+encodeURIComponent($('roleFilter').value);
      if($('statusFilter')&&$('statusFilter').value)q+='&status='+encodeURIComponent($('statusFilter').value);
      var d=await api(q), users=arr(d,['users','rows','data']);
      var counter=$('userCount'); if(counter)counter.textContent=Number(users.length||0).toLocaleString('en-US');
      tbody.innerHTML=users.map(function(u){
        var name=u.name||u.username||u.email||'User';
        return '<tr><td><b>'+esc(name)+'</b><div class="muted">'+esc(u.email||u.username||u.id)+'</div></td><td>'+esc(u.role||'-')+'</td><td>'+esc(u.shopName||(u.shop&&u.shop.name)||u.tenantId||'-')+'</td><td>'+badge(userStatus(u))+'</td><td>'+badge(loginType(u))+'</td><td><div class="row-actions"><button class="btn outline" onclick="authSetup(\''+u.id+'\',\''+esc(u.username||u.email||'User')+'\')">Auth</button><button class="btn primary" onclick="googleLink(\''+u.id+'\',\''+esc(u.email||'')+'\')">Google Link</button></div></td></tr>'
      }).join('')||'<tr><td colspan="6" class="muted">No users found</td></tr>';
    }catch(e){tbody.innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>'}
  };
  var oldGoogleLink=window.googleLink;
  window.googleLink=function(id,email){
    if(typeof window.openModal!=='function'){return oldGoogleLink&&oldGoogleLink(id,email)}
    window.openModal('Google OAuth Link', '<p class="muted">ဒီ user က password နဲ့လည်း login ဝင်နိုင်ပြီး Google နဲ့လည်း login ဝင်နိုင်အောင် link လုပ်ပါမယ်။ Password login ကို မဖျက်ပါ။</p><div class="form-group"><label>Google Email</label><input id="googleEmail" value="'+esc(email||'')+'"></div><div class="modal-actions"><button class="btn outline" onclick="closeModal()">Cancel</button><button id="saveGoogle" class="btn primary">Link Google + Keep Password</button></div>');
    var btn=$('saveGoogle');
    btn.onclick=function(){
      var value=$('googleEmail').value.trim();
      if(!value){alert('Google email ထည့်ပါ');return}
      window.confirmTyped('Google OAuth Link','Password login ကိုထားပြီး Google login ကိုပါ enable လုပ်မယ်။','GOOGLE',function(){return api('/api/grand-admin/users/'+id+'/google-link',{method:'POST',body:JSON.stringify({email:value,allowLink:true})}).then(function(){if(typeof window.loadUsers==='function')window.loadUsers()})})
    }
  };
  setTimeout(function(){try{if(document.querySelector('#panel-users.active')&&typeof window.loadUsers==='function')window.loadUsers()}catch(e){}},700);
})();
