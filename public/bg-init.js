(function() {
  try {
    var path = window.location.pathname.split('/').filter(Boolean)[0];
    if (!['cart','order','status','confirm'].includes(path)) return;

    var rid = null;
    try {
      var sess = JSON.parse(localStorage.getItem('tableSession') || 'null');
      if (sess && sess.restaurantId) rid = sess.restaurantId;
    } catch(e) {}

    var getVal = function(prefix) {
      if (rid) {
        var v = localStorage.getItem(prefix + rid);
        if (v) return v;
      }
      var keys = Object.keys(localStorage).filter(function(k){ return k.startsWith(prefix); });
      return keys.length === 1 ? localStorage.getItem(keys[0]) : null;
    };

    var bgType = getVal('bg_type_');
    var bgUrl  = getVal('bg_url_');
    var color  = getVal('brand_color_');
    var bg = null;

    if (bgType === 'image' && bgUrl) {
      bg = 'url(' + bgUrl + ') center/cover no-repeat fixed';
    } else if (bgType === 'color' && bgUrl) {
      bg = bgUrl;
    } else if (color && color !== '#ffffff') {
      var h = color.replace('#','');
      var n = parseInt(h.length===3 ? h.split('').map(function(c){return c+c;}).join('') : h, 16);
      var r=(n>>16)&255, g=(n>>8)&255, b=n&255;
      var mix=function(t){ return 'rgb('+Math.round(r+(255-r)*t)+','+Math.round(g+(255-g)*t)+','+Math.round(b+(255-b)*t)+')'; };
      bg = 'linear-gradient(160deg,#ffffff 0%,'+mix(0.92)+' 40%,'+mix(0.82)+' 75%,'+mix(0.88)+' 100%)';
    }

    if (bg) document.documentElement.style.background = bg;
  } catch(e) {}
})();