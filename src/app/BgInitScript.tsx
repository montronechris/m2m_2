export function BgInitScript() {
  const script = `(function() {
    try {
      var path = window.location.pathname.split('/').filter(Boolean)[0];
      if (!['cart','order','status','confirm'].includes(path)) return;
      // ... resto dello script invariato
    } catch(e) {}
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}