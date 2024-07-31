const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

// Fungsi untuk memeriksa apakah URL ter-redirect ke domain tertentu
const getFinalUrl = async (url) => {
  try {
    const response = await axios.get(url, { maxRedirects: 0 });
    return response.request.res.responseUrl; // URL akhir setelah redirect
  } catch (error) {
    if (error.response && error.response.status === 302) {
      return error.response.headers.location; // URL setelah redirect
    }
    throw error; // Menangani kesalahan lain
  }
};

// Fungsi untuk mengubah URL Mega dari '/file' ke '/embed'
const convertMegaUrl = (url) => {
  return url.includes('/file') ? url.replace('/file', '/embed') : url;
};

// Fungsi untuk memfilter dan memilih link download
const filterDownloadLinks = async (links) => {
  const filteredLinks = [];
  
  for (const link of links) {
    const finalUrl = await getFinalUrl(link.link);
    if (finalUrl.includes('mega.nz')) {
      filteredLinks.push(convertMegaUrl(finalUrl));
    }
  }
  
  return filteredLinks.length > 0 ? [filteredLinks[0]] : [];
};

// Endpoint untuk scraping
app.get('/scrape/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const url = `https://s123456789.vercel.app/api/v1/episode/${endpoint}`;

  try {
    // Melakukan permintaan ke API
    const response = await axios.get(url);
    const { title, list_episode, quality } = response.data;

    // Ambil data yang diperlukan dari list_episode
    const episodes = list_episode.map(episode => ({
      episode_title: episode.list_episode_title,
      episode_endpoint: episode.list_episode_endpoint
    }));

    // Ambil data dari quality
    let quality_list = {};
    if (quality) {
      quality_list = {};

      // Ambil data untuk low_quality jika ada
      if (quality.low_quality) {
        quality_list.low_quality = {
          quality: quality.low_quality.quality,
          size: quality.low_quality.size,
          download_links: await filterDownloadLinks(quality.low_quality.download_links)
        };
      }

      // Ambil data untuk medium_quality jika ada
      if (quality.medium_quality) {
        quality_list.medium_quality = {
          quality: quality.medium_quality.quality,
          size: quality.medium_quality.size,
          download_links: await filterDownloadLinks(quality.medium_quality.download_links)
        };
      }

      // Ambil data untuk high_quality jika ada
      if (quality.high_quality) {
        quality_list.high_quality = {
          quality: quality.high_quality.quality,
          size: quality.high_quality.size,
          download_links: await filterDownloadLinks(quality.high_quality.download_links)
        };
      }
    }

    // Mengembalikan data JSON yang diambil
    res.json({ title, episodes, quality_list });
  } catch (error) {
    // Menangani kesalahan jika ada
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
