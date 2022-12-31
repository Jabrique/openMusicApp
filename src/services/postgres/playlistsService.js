const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/invariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async verifyPlaylistOwner(id, owner) {
    const result = await this._pool.query({
      text: 'SELECT * FROM playlists WHERE id=$1',
      values: [id],
    });

    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    if (result.rows[0].owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists VALUES ($1,$2,$3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists({ owner }) {
    const query = {
      text: 'SELECT playlists.id, playlists.name, users.username FROM playlists LEFT JOIN users ON playlists.owner=users.id LEFT JOIN collaborations ON playlists.id=collaborations.playlist_id WHERE playlists.owner=$1 OR collaborations.user_id=$1',
      values: [owner],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async deletePlaylist(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id=$1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Catatan tidak ditemukan');
    }
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = `playlist_song-${nanoid(16)}`;
    const query = {
      text: 'SELECT * FROM songs WHERE id=$1',
      values: [songId],
    };

    const songResult = await this._pool.query(query);

    if (!songResult.rows.length) {
      throw new NotFoundError('Lagu gagal ditambahkan');
    }

    await this._pool.query({
      text: 'INSERT INTO playlist_songs VALUES( $1, $2, $3)',
      values: [id, playlistId, songId],
    });
  }

  async getSongsFromPlaylist(playlistId) {
    const playlist = await this._pool.query({
      text: 'SELECT playlists.id, playlists.name, users.username FROM playlist_songs INNER JOIN playlists on playlist_songs.playlist_id = playlists.id INNER JOIN users ON playlists.owner = users.id WHERE playlist_id = $1 LIMIT 1',
      values: [playlistId],
    });

    if (!playlist.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const songsData = await this._pool.query({
      text: 'SELECT songs.id, songs.title, songs.performer FROM playlist_songs INNER JOIN songs on playlist_songs.song_id = songs.id WHERE playlist_id =$1',
      values: [playlistId],
    });

    playlist.rows[0].songs = songsData.rows;
    return playlist.rows[0];
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const result = await this._pool.query({
      text: 'DELETE FROM playlist_songs WHERE playlist_id=$1 AND song_id=$2',
      values: [playlistId, songId],
    });

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal dihapus');
    }
  }

  async addActivity(playlistId, songId, userId) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    const action = 'add';

    const userQuery = await this._pool.query({
      text: 'SELECT username FROM users WHERE id=$1',
      values: [userId],
    });

    const { username } = userQuery.rows[0];

    const songQuery = await this._pool.query({
      text: 'SELECT title FROM songs WHERE id=$1',
      values: [songId],
    });

    const { title } = songQuery.rows[0];

    await this._pool.query({
      text: 'INSERT INTO playlist_song_activities VALUES($1,$2,$3,$4,$5,$6)',
      values: [id, playlistId, title, username, action, time],
    });
  }

  async deleteActivity(playlistId, songId, userId) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    const action = 'delete';

    const userQuery = await this._pool.query({
      text: 'SELECT username FROM users WHERE id=$1',
      values: [userId],
    });

    const { username } = userQuery.rows[0];

    const songQuery = await this._pool.query({
      text: 'SELECT title FROM songs WHERE id=$1',
      values: [songId],
    });

    const { title } = songQuery.rows[0];

    await this._pool.query({
      text: 'INSERT INTO playlist_song_activities VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      values: [id, playlistId, title, username, action, time],
    });
  }

  async getActivity(playlistId) {
    const result = await this._pool.query({
      text: 'SELECT * FROM playlist_song_activities WHERE Playlist_id=$1 ',
      values: [playlistId],
    });

    if (!result.rows.length) {
      throw new NotFoundError('playlist tidak ditemukan');
    }

    const activityMap = result.rows.map((row) => ({
      username: row.user_id,
      title: row.song_id,
      action: row.action,
      time: row.time,
    }));

    return activityMap;
  }
}

module.exports = PlaylistsService;
