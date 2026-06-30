function syncActiveNavState() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    if (button.classList.contains("active")) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

document.addEventListener("click", () => setTimeout(syncActiveNavState, 60));
document.addEventListener("change", () => setTimeout(syncActiveNavState, 60));
setInterval(syncActiveNavState, 1000);
setTimeout(syncActiveNavState, 220);
