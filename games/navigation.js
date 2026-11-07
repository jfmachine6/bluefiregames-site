try {
    const response = await fetch("/nav.html");
    if (!response.ok) throw new Error(`Navigation request failed (${response.status})`);
    document.getElementById("nav-placeholder").innerHTML = await response.text();
    document.querySelector('.nav-item[href="/games/"]').setAttribute("aria-current", "page");
} catch (error) {
    console.error("Games navigation could not load.", error);
    document.getElementById("nav-placeholder").textContent = "Navigation unavailable. ";
    const home = document.createElement("a");
    home.href = "/";
    home.textContent = "Return home";
    document.getElementById("nav-placeholder").append(home);
}
