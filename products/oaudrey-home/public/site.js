/* Browser demo for the oAudrey front page.
   The loop only changes which card is marked active. It does not fetch,
   count visitors, or call a model. 2026-11-11 MarketShipper. */

(function () {
  var steps = ['plan', 'act', 'check', 'ship'];
  var index = 0;
  var timer = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = reduce;
  var root = document.documentElement;
  var pauseButton = document.getElementById('loop-pause');
  var nextButton = document.getElementById('loop-next');
  var status = document.getElementById('loop-status');
  var modes = document.querySelectorAll('input[name="a11y"]');
  var storageKey = 'oaudrey-a11y-mode';

  function cardText(step) {
    var card = document.querySelector('[data-step="' + step + '"]');
    if (!card) return step;
    var title = card.querySelector('h2');
    var detail = card.querySelector('p');
    return (title ? title.textContent : step) + '. ' + (detail ? detail.textContent : '');
  }

  function render() {
    steps.forEach(function (step, stepIndex) {
      var card = document.querySelector('[data-step="' + step + '"]');
      if (!card) return;
      var on = stepIndex === index;
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-current', on ? 'step' : 'false');
    });
    if (status) {
      status.textContent = 'Demo. Step ' + (index + 1) + ' of ' + steps.length + '. ' + cardText(steps[index]);
    }
  }

  function tick() {
    index = (index + 1) % steps.length;
    render();
  }

  function schedule() {
    window.clearInterval(timer);
    timer = 0;
    if (paused) return;
    if (root.getAttribute('data-a11y') === 'sensory' || root.getAttribute('data-a11y') === 'eco') return;
    timer = window.setInterval(tick, 2400);
  }

  function setPaused(next) {
    paused = next;
    if (pauseButton) {
      pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseButton.textContent = paused ? 'Play demo' : 'Pause demo';
    }
    schedule();
  }

  function applyMode(mode) {
    var allowed = {
      standard: 1,
      wcag_aaa: 1,
      dyslexia: 1,
      adhd: 1,
      sensory: 1,
      large_print: 1,
      eco: 1
    };
    var next = allowed[mode] ? mode : 'standard';
    root.setAttribute('data-a11y', next);
    modes.forEach(function (input) {
      input.checked = input.value === next;
    });
    try {
      window.localStorage.setItem(storageKey, next);
    } catch (error) {
      /* Private mode can refuse storage. The view still applies for this load. */
    }
    if (next === 'sensory' || next === 'eco') setPaused(true);
    else schedule();
  }

  if (pauseButton) {
    pauseButton.addEventListener('click', function () {
      setPaused(!paused);
    });
  }
  if (nextButton) {
    nextButton.addEventListener('click', function () {
      tick();
      schedule();
    });
  }
  modes.forEach(function (input) {
    input.addEventListener('change', function () {
      if (input.checked) applyMode(input.value);
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.altKey && (event.key === 'a' || event.key === 'A') && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      var order = ['standard', 'wcag_aaa', 'dyslexia', 'adhd', 'sensory', 'large_print', 'eco'];
      var current = root.getAttribute('data-a11y') || 'standard';
      var at = order.indexOf(current);
      applyMode(order[(at + 1) % order.length]);
    }
  });

  var saved = 'standard';
  try {
    saved = window.localStorage.getItem(storageKey) || 'standard';
  } catch (error) {
    saved = 'standard';
  }
  applyMode(saved);
  setPaused(paused || root.getAttribute('data-a11y') === 'sensory' || root.getAttribute('data-a11y') === 'eco');
  render();

  var play = document.getElementById('song-play');
  var link = document.getElementById('song-link');
  var audio = document.getElementById('song-audio');
  if (play && audio) {
    play.hidden = true;
    audio.muted = true;
    fetch('/audio/candyland-song.mp3', { method: 'HEAD' }).then(function (res) {
      if (!res.ok) return;
      if (link) link.hidden = true;
      play.hidden = false;
      play.addEventListener('click', function () {
        if (!audio.getAttribute('src')) audio.src = '/audio/candyland-song.mp3';
        audio.muted = false;
        if (audio.paused) audio.play();
        else audio.pause();
        play.textContent = audio.paused ? 'Play theme' : 'Pause theme';
        play.setAttribute('aria-pressed', audio.paused ? 'false' : 'true');
      });
    }).catch(function () { play.hidden = true; });
  }
})();
