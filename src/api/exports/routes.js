function routes(handler) {
  return [
    {
      method: 'POST',
      path: '/export/playlists/{playlistId}',
      handler: handler.postExportsHandler,
      options: { auth: 'musicapp_jwt' },
    },
  ];
}
module.exports = routes;
