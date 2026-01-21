const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const tiktokDl = async (url) => {
  return new Promise(async (resolve, reject) => {
    try {
      const domain = "https://www.tikwm.com/api/";

      const res = await axios.post(
        domain,
        {},
        {
          headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
          },
          params: { url, hd: 1 },
        }
      );

      const resData = res.data?.data;
      if (!resData) throw new Error("Gagal mengambil data dari TikWM API.");

      const formatNumber = (num) =>
        Number(num || 0).toLocaleString("id-ID").replace(/,/g, ".");
      const formatDate = (n) =>
        new Date(n * 1000).toLocaleString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        });

      const media = [];
      if (resData.images?.length) {
        resData.images.forEach((img) =>
          media.push({ type: "photo", url: img })
        );
      } else {
        if (resData.hdplay)
          media.push({ type: "nowatermark_hd", url: resData.hdplay });
        else if (resData.play)
          media.push({ type: "nowatermark", url: resData.play });
        else if (resData.wmplay)
          media.push({ type: "watermark", url: resData.wmplay });
      }

      const result = {
        status: true,
        id: resData.id,
        title: resData.title || "Tanpa Judul",
        region: resData.region,
        created_at: formatDate(resData.create_time),
        cover: resData.cover,
        duration: resData.duration + " detik",
        stats: {
          views: formatNumber(resData.play_count),
          likes: formatNumber(resData.digg_count),
          comments: formatNumber(resData.comment_count),
          shares: formatNumber(resData.share_count),
          downloads: formatNumber(resData.download_count),
        },
        author: {
          id: resData.author.id,
          username: resData.author.unique_id,
          nickname: resData.author.nickname,
          avatar: resData.author.avatar,
        },
        music: {
          id: resData.music_info.id,
          title: resData.music_info.title,
          author: resData.music_info.author,
          album: resData.music_info.album || "-",
          url: resData.music || resData.music_info.play,
        },
        media,
      };

      resolve(result);
    } catch (err) {
      reject({
        status: false,
        message:
          err?.response?.data?.msg ||
          err.message ||
          "Terjadi kesalahan saat memproses link TikTok.",
      });
    }
  });
};

module.exports = { tiktokDl }

// db.func("scrape").tiktokDl