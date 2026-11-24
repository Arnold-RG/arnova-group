"use strict";
(function () {
  var video = document.querySelector(".arnova-film-video");
  var film = document.querySelector(".arnova-film");
  if (!video || !film) return;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var started = false;
  var finished = false;
  var stopAt = 5;
  var stopTimer = null;

  video.muted = true;
  video.defaultMuted = true;
  video.loop = false;
  video.removeAttribute("loop");
  video.playsInline = true;
  video.autoplay = false;
  video.removeAttribute("autoplay");

  function showFrame() {
    film.classList.add("is-playing");
  }

  function hideFrame() {
    film.classList.remove("is-playing");
  }

  function hold() {
    if (finished) return;
    finished = true;
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    try {
      if (video.currentTime > stopAt) {
        video.currentTime = stopAt;
      }
    } catch (e) {}
    video.pause();
    showFrame();
  }

  function armStop() {
    if (finished || stopTimer) return;
    var remaining = Math.max(0, (stopAt - video.currentTime) * 1000);
    stopTimer = setTimeout(function () {
      stopTimer = null;
      hold();
    }, remaining);
  }

  function startOnce() {
    if (reduceMotion || started || finished) return;
    started = true;
    video.play().then(function () {
      if (finished) return;
      showFrame();
      armStop();
    }).catch(function () {
      finished = true;
      hideFrame();
    });
  }

  video.addEventListener("timeupdate", function () {
    if (!finished && video.currentTime >= stopAt) {
      hold();
    }
  });
  video.addEventListener("ended", function () {
    hold();
  });
  video.addEventListener("playing", function () {
    if (finished) {
      video.pause();
      showFrame();
      return;
    }
    showFrame();
    armStop();
  });

  if (reduceMotion) {
    video.pause();
    try { video.currentTime = 0; } catch (e) {}
    hideFrame();
    return;
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        startOnce();
      }
    }, { threshold: 0.2 });
    io.observe(film);
  } else {
    startOnce();
  }
})();
