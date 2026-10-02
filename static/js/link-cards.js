(function () {
  var cards = document.querySelectorAll('.link-card[data-url]');
  if (!cards.length) return;

  cards.forEach(function (card) {
    var url = card.getAttribute('data-url');

    fetch('https://api.microlink.io/?url=' + encodeURIComponent(url) + '&palette=true')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.status !== 'success' || !data.data) return;
        var d = data.data;

        if (d.title) {
          card.querySelector('.link-card-title').textContent = d.title;
        }
        if (d.description) {
          var desc = document.createElement('span');
          desc.className = 'link-card-desc';
          desc.textContent = d.description;
          card.insertBefore(desc, card.querySelector('.link-card-meta'));
        }
        if (d.image && d.image.url) {
          var img = document.createElement('img');
          img.className = 'link-card-img';
          img.src = d.image.url;
          img.alt = '';
          img.loading = 'lazy';
          card.insertBefore(img, card.querySelector('.link-card-title'));
        }
        if (d.logo && d.logo.url) {
          var logo = document.createElement('img');
          logo.className = 'link-card-logo';
          logo.src = d.logo.url;
          logo.alt = '';
          card.insertBefore(logo, card.querySelector('.link-card-title'));
        }
        card.classList.add('link-card-loaded');
      })
      .catch(function () { /* keep plain card */ });
  });
})();
