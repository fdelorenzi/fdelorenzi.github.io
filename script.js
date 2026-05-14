function toggleMenu(btn) {
  var nav = document.getElementById("nav");
  var open = nav.classList.toggle("open");
  if (btn && btn.setAttribute) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
}
