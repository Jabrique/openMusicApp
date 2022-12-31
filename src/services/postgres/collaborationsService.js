const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/invariantError');

class CollaborationsService {
  constructor() {
    this._pool = new Pool();
  }

  async verifyCollaborator(noteId, userId) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [noteId, userId],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal diverifikasi');
    }
  }

  async addCollaborator({ playlistId, userId }) {
    const id = `collab-${nanoid(16)}`;

    const result = await this._pool.query({
      text: 'INSERT INTO collaborations VALUES ($1,$2,$3) RETURNING id',
      values: [id, playlistId, userId],
    });

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async removeCollaborator(playlistId, userId) {
    const result = await this._pool.query({
      text: 'DELETE FROM collaborations WHERE playlist_id=$1 AND user_id=$2 RETURNING id',
      values: [playlistId, userId],
    });

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal dihapus');
    }
  }
}

module.exports = CollaborationsService;
