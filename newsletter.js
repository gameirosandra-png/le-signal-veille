document.getElementById('newsletter-form')?.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=document.getElementById('newsletter-status');button.disabled=true;status.textContent='Envoi de votre demande…';
 try{const response=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,consent:form.elements.consent.checked,website:form.elements.website.value})});const result=await response.json();status.textContent=result.message;if(response.ok)form.reset();}
 catch{status.textContent='Le service est indisponible. Réessayez plus tard.';}finally{button.disabled=false;}
});
