// SEEDED BUG: console.error on load of /reports. FIXED=1 loads quietly.
if (document.body.dataset.fixed !== '1') console.error('reports: failed to read widget config (config.widgets is undefined)');
document.getElementById('widgets').textContent = 'Widgets: revenue, signups';
