const id = "store-pilot-notes-owner-style";
if (!document.getElementById(id)) {
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "./css/notes-screen-controller.css?v=command-center-27";
  document.head.appendChild(link);
}
