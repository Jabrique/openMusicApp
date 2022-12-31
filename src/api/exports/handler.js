const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(playlistsService, exportsService, validator) {
    this._playlistsService = playlistsService;
    this._exportsService = exportsService;
    this._validator = validator;

    autoBind(this);
  }

  async postExportsHandler(request, h) {
    this._validator.ExportsNotesPayload(request.payload);

    const { playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    const message = {
      credentialId,
      targetEmail: request.payload.targetEmail,
      playlistId,
    };

    await this._exportsService.sendMessage('exports:playlist', JSON.stringify(message));
    const response = h.response({
      status: 'success',
      message: 'Permintaan dalam antrian',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
