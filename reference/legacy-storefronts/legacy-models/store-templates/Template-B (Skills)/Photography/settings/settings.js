// Settings page interactions (sidebar, panels, uploads, dynamic lists)
(function(){
  const menuButtons = document.querySelectorAll('[data-settings-target]');
  const panels = document.querySelectorAll('[data-settings-panel]');

  function setActivePanel(id){
    panels.forEach(panel=>{
      panel.classList.toggle('is-active', panel.dataset.settingsPanel === id);
    });
    menuButtons.forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.settingsTarget === id);
    });
  }

  if(menuButtons.length && panels.length){
    menuButtons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.settingsTarget;
        if(!id) return;
        setActivePanel(id);
      });
    });
  }

  // Image previews for uploads
  function handleImagePreview(input){
    const key = input.dataset.previewTarget;
    if(!key || !input.files || !input.files[0]) return;

    const file = input.files[0];
    if(!file.type || !file.type.startsWith('image/')) return;

    const preview = document.querySelector('[data-preview="'+ key +'"]');
    if(!preview) return;

    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.innerHTML = '';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }

  document.addEventListener('change', (e)=>{
    const input = e.target;
    if(input.matches('input[type="file"][data-preview-target]')){
      handleImagePreview(input);
    }
  });

  // Dynamic lists: offers, artwork, extras
  const offersList = document.querySelector('[data-offers-list]');
  const artworkList = document.querySelector('[data-artwork-list]');
  const extrasList = document.querySelector('[data-extras-list]');

  function cloneItem(selector){
    const template = document.querySelector(selector);
    if(!template) return null;
    const clone = template.cloneNode(true);

    // Clear text + number inputs
    clone.querySelectorAll('input').forEach(input=>{
      if(input.type === 'text' || input.type === 'url' || input.type === 'number'){
        input.value = '';
      }
    });
    // Clear textareas
    clone.querySelectorAll('textarea').forEach(area=> area.value = '');

    // Reset previews in this clone
    clone.querySelectorAll('[data-preview]').forEach(preview=>{
      preview.innerHTML = '<span>Image</span>';
    });

    // Reset file inputs
    clone.querySelectorAll('input[type="file"][data-preview-target]').forEach(input=>{
      input.value = '';
    });

    return clone;
  }

  let artworkIndex = 1;
  const firstArtworkFile = document.querySelector('[data-artwork-item] input[type="file"][data-preview-target]');
  if(firstArtworkFile){
    const key = firstArtworkFile.dataset.previewTarget || '';
    const match = key.match(/(\d+)$/);
    if(match){
      artworkIndex = parseInt(match[1], 10) || 1;
    }
  }

  function createArtworkItem(){
    const template = document.querySelector('[data-artwork-item]');
    if(!template) return null;
    const clone = template.cloneNode(true);

    artworkIndex += 1;
    const newKey = 'artwork-' + artworkIndex;

    // Update preview + file target
    const preview = clone.querySelector('[data-preview]');
    if(preview){
      preview.setAttribute('data-preview', newKey);
      preview.innerHTML = '<span>Image</span>';
    }
    const fileInput = clone.querySelector('input[type="file"][data-preview-target]');
    if(fileInput){
      fileInput.setAttribute('data-preview-target', newKey);
      fileInput.value = '';
    }

    // Clear inputs
    clone.querySelectorAll('input').forEach(input=>{
      if(input.type === 'text' || input.type === 'url' || input.type === 'number'){
        input.value = '';
      }
    });
    clone.querySelectorAll('textarea').forEach(area=> area.value = '');

    return clone;
  }

  // Click handlers for add / remove
  document.addEventListener('click', (e)=>{
    const addOffer = e.target.closest('[data-add-offer]');
    const removeOffer = e.target.closest('[data-remove-offer]');
    const addArtwork = e.target.closest('[data-add-artwork]');
    const removeArtwork = e.target.closest('[data-remove-artwork]');
    const addExtra = e.target.closest('[data-add-extra]');
    const removeExtra = e.target.closest('[data-remove-extra]');

    if(addOffer && offersList){
      const item = cloneItem('[data-offer-item]');
      if(item) offersList.appendChild(item);
    }

    if(removeOffer){
      const item = removeOffer.closest('[data-offer-item]');
      if(item && offersList){
        if(offersList.children.length > 1){
          item.remove();
        }else{
          // Just clear the last one
          item.querySelectorAll('input, textarea').forEach(el=> el.value = '');
        }
      }
    }

    if(addArtwork && artworkList){
      const item = createArtworkItem();
      if(item) artworkList.appendChild(item);
    }

    if(removeArtwork){
      const item = removeArtwork.closest('[data-artwork-item]');
      if(item && artworkList){
        if(artworkList.children.length > 1){
          item.remove();
        }else{
          item.querySelectorAll('input, textarea').forEach(el=> el.value = '');
          const preview = item.querySelector('[data-preview]');
          if(preview) preview.innerHTML = '<span>Image</span>';
        }
      }
    }

    if(addExtra && extrasList){
      const item = cloneItem('[data-extra-item]');
      if(item) extrasList.appendChild(item);
    }

    if(removeExtra){
      const item = removeExtra.closest('[data-extra-item]');
      if(item && extrasList){
        if(extrasList.children.length > 1){
          item.remove();
        }else{
          item.querySelectorAll('input, textarea').forEach(el=> el.value = '');
        }
      }
    }
  });

})();