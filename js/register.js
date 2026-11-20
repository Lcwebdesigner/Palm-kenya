const form = document.getElementById('applicationForm');
form?.addEventListener('submit', async e => {
  e.preventDefault(); const msg=document.getElementById('formMessage'); const btn=form.querySelector('[type=submit]');
  msg.textContent='Submitting application…'; msg.className='form-message'; btn.disabled=true;
  try {
    const c=requirePalmClient(), f=new FormData(form), file=f.get('id_document');
    if(!file || file.size>5*1024*1024) throw new Error('Choose an ID file no larger than 5 MB.');
    if(!['image/jpeg','image/png','application/pdf'].includes(file.type)) throw new Error('Only JPG, PNG or PDF files are accepted.');
    const phone=String(f.get('phone')).replace(/[\s()-]/g,'');
    if(!/^\+?[0-9]{9,15}$/.test(phone)) throw new Error('Enter a valid phone number.');
    const path=`${crypto.randomUUID()}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const {error:upErr}=await c.storage.from('id-documents').upload(path,file,{contentType:file.type,upsert:false}); if(upErr) throw upErr;
    const {error}=await c.from('applications').insert({full_name:String(f.get('full_name')).trim(),phone,id_file_path:path});
    if(error){await c.storage.from('id-documents').remove([path]);throw error;}
    form.reset(); msg.textContent='Your application has been submitted. The foundation will review it and contact you.'; msg.classList.add('success');
  } catch(err){msg.textContent=err.message||'Unable to submit application.';msg.classList.add('error');} finally{btn.disabled=false;}
});
