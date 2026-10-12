let errorShown = false
window.addEventListener("error", (e) => { if (!errorShown) { errorShown = true; alert("Script error: " + e.message + " (index.js line " + e.lineno + ")"); } })
window.addEventListener("unhandledrejection", (e) => { if (!errorShown) { errorShown = true; alert("Script error: " + (e.reason && e.reason.message || e.reason)); } })
document.title = "CDN finder (build 4)"
let version = "1803"
let urls = []
const sources = {}
let results = {}      // url -> {status, buf} filled by the status check, so each file is only downloaded once
let pendingChecks = 0
let errDivTimeout
const proxy_url = "http://localhost:8088"//"https://aliensoda.space"
document.getElementById("url").addEventListener("keyup", generateUrl);
document.getElementById("ver").addEventListener("keyup", setVersion);
document.getElementById("repBt").addEventListener("click", repeatUrls);
document.getElementById("base").addEventListener("keyup", setBaseUrl);
document.getElementById("resizer").addEventListener("click", resize);
document.getElementById("resizer").addEventListener("touchstart", resize);

document.getElementById("rep_1").addEventListener("keyup", setRep);
document.getElementById("rep_2").addEventListener("keyup", setRep);

function setRep() {
  localStorage.setItem("rep",JSON.stringify({rep1:document.getElementById("rep_1").value,rep2:document.getElementById("rep_2").value}))
}
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
}, true);
document.addEventListener("DOMContentLoaded", (event) => {
    version = localStorage.getItem("ver") || version
    baseUrl = localStorage.getItem("base") || ""
    document.getElementById("url").value = localStorage.getItem("url") || ""
    document.getElementById("ver").value = version
    document.getElementById("base").value = baseUrl
    var rep = JSON.parse(localStorage.getItem("rep")) || { rep1: "", rep2: "" }
    document.getElementById("rep_1").value = rep.rep1
    document.getElementById("rep_2").value = rep.rep2
})
let errDiv = document.getElementById("error")
var logSize = 0
var baseUrl = ""
let curX = 0;
let startWidth = 0;
var bgstyle = 1
function resize(event) {
  event.preventDefault();
  const output = document.getElementsByClassName("output-left")[0];
  
  curX = event.clientX;
  startWidth = output.offsetWidth;

  document.addEventListener("mousemove", resizeTick);
  document.addEventListener("touchmove", resizeTick);
  document.addEventListener("mouseup", stopResize);
  document.addEventListener("touchend", stopResize);
}

function resizeTick(event) {
  const output = document.getElementsByClassName("output-left")[0];
  const currentMouseX = event.clientX;
  
  output.style.width = (startWidth + (currentMouseX - curX)) - 6 + "px";
}

function stopResize() {
  document.removeEventListener("mousemove", resizeTick);
  document.removeEventListener("mouseup", stopResize);
}

function setBaseUrl(){
    baseUrl = document.getElementById("base").value
    localStorage.setItem("base",baseUrl)
}
function runCheck(resDiv, url) {
  resDiv.classList.remove("success", "fail");
  resDiv.innerText = "...";
  pendingChecks++;

  fetch(proxy_url + "/proxy?url=" + encodeURIComponent(url), { method: 'GET',  "cors":"cors" })
    .then(async res => {
      resDiv.innerText = res.status;
      if (res.ok) {
        resDiv.classList.add("success");
        results[url] = { status: res.status, buf: await res.arrayBuffer() };
      } else {
        resDiv.classList.add("fail");
        results[url] = { status: res.status };
      }
    })
    .catch((res) => {
      results[url] = { status: "ERR" };
      resDiv.innerText = "ERR";

      if (res.status == 404) resDiv.innerText = "Err 404";
      if (res.status == 503) resDiv.innerText = "Server returned possible CORS error";
      resDiv.classList.add("fail");
      errDiv.style.opacity = null
      errDiv.classList.remove("fade");
      errDiv.style.left = resDiv.offsetLeft + "px";
      errDiv.style.top = resDiv.offsetTop + "px";
      clearTimeout(errDivTimeout);

      errDivTimeout = setTimeout(() => {
        errDiv.classList.add("fade");
      }, 3000);
    })
    .finally(() => { pendingChecks--; });
}
function makeDiv(url,ver,seq = ""){
   var outputOrig = document.getElementsByClassName("output-left")[0];
  var output = document.getElementsByClassName("output-right")[0];

  let div = document.createElement("a");
  div.className = "style-" + bgstyle
  div.innerHTML = "<div class=\"a-text\"> " + url + "</div>";
  bgstyle = bgstyle == 1 ? 2 : 1
  var resDiv = document.createElement("a");
  resDiv.className = "style-" + bgstyle
  resDiv.innerText = "...";
  var extraInfo = document.createElement("div");
  extraInfo.innerHTML = "<div class=\"info-sep\">" + "CDN ver: " + ver + "</div>" + "<div class=\"info-sep\">" + "base  url: " +  seq + "</div>"
  extraInfo.classList.add("extra-info")
  div.appendChild(extraInfo)
  runCheck(resDiv, url)
  div.addEventListener("click", function(e){
    rightClickDelete(e, resDiv, div, url);
  });
  outputOrig.appendChild(resDiv);
  output.appendChild(div);
  urls.push(url);
  sources[url] = seq;
}
async function repeatUrls(){
  try { await repeatUrlsInner(); } catch (e) { alert("Repeat failed: " + (e && e.message ? e.message : e)); }
}
async function repeatUrlsInner(){
    const MAX_ROWS = 20000;
    var prefix = document.getElementById("url").value.trim();   // optional: blank = just the numbers
    var rep_1 = Number(document.getElementById("rep_1").value || 0);
    var rep_2 = Number(document.getElementById("rep_2").value || 10);
    if (isNaN(rep_1) || isNaN(rep_2)) { alert("Enter whole numbers in the 'from' and 'to' boxes."); return; }
    if (rep_2 < rep_1) { alert("'to' must be bigger than 'from'."); return; }
    const urlMakerInstance = new urlMaker();
    let added = 0;
    for(var seq = rep_1; seq <= rep_2; seq++){
        if (urls.length >= MAX_ROWS) {
            alert("List is full (" + MAX_ROWS + " rows). Added " + added + ". Download, then press clear and continue from " + seq + ".");
            return;
        }
        let url = urlMakerInstance.fetchCDNURL(prefix + seq)
        makeDiv(url, version, prefix + seq)
        added++;
    }
    const btn = document.getElementById("repBt");
    btn.textContent = "added " + added;
    setTimeout(() => { btn.textContent = "repeat from"; }, 2000);
}
function rightClickDelete(event,org,div,url){
  console.log(event)
  if (event.button == 2) {
    var outputOrig = document.getElementsByClassName("output-left")[0];
    var output = document.getElementsByClassName("output-right")[0];
    output.removeChild(div);
    outputOrig.removeChild(org);
    urls.splice(urls.indexOf(url), 1);
    logSize -= 1
  } else {
    window.open(url)
  }
}

function setVersion(){
    version = document.getElementById("ver").value;
    localStorage.setItem("ver",version)
}
async function generateUrl(key){
  var url = document.getElementById("url").value;
  localStorage.setItem("url",url)
  if(key.keyCode != 13) return;
  var outputOrig = document.getElementsByClassName("output-left")[0];
  const urlMakerInstance = new urlMaker();
  var orgUrl = url
  url = urlMakerInstance.fetchCDNURL(url)
  makeDiv(url,version,orgUrl)
  logSize +=1
}
function clearOutput(){
    var output = document.getElementsByClassName("output-right")[0];
    output.innerHTML = "";
    output = document.getElementsByClassName("output-left")[0];
    output.innerHTML = "";
    urls = [];
    results = {};
    logSize = 0
}

let downloadAborted = false;

async function downloadAll() {
    if (urls.length === 0) return;
    downloadAborted = false;

    const bar = document.getElementById("dl-progress-bar");
    const barFill = document.getElementById("dl-bar-fill");
    const barLabel = document.getElementById("dl-bar-label");
    const barBtn = document.getElementById("download");

    // Chrome/Edge: ask where to save FIRST (needs the click), then stream the zip straight to disk.
    // Other browsers fall back to building one zip in memory.
    let handle = null;
    if (typeof window.showSaveFilePicker === "function") {
        try {
            handle = await window.showSaveFilePicker({
                suggestedName: "assets.zip",
                types: [{ description: "Zip archive", accept: { "application/zip": [".zip"] } }]
            });
        } catch (e) { return; } // cancelled the save dialog
    }

    bar.style.display = "flex";
    barBtn.textContent = "cancel";
    barBtn.onclick = () => { downloadAborted = true; };
    const setBar = (pct, text) => { barFill.style.width = pct + "%"; barLabel.textContent = text; };

    const all = [...new Set(urls)];
    const total = all.length;

    // 1) wait for the status checks (they already pulled every file that exists)
    while (pendingChecks > 0 && !downloadAborted) {
        const done = all.filter(u => results[u]).length;
        setBar(Math.round(done / total * 100), "checking " + done + " / " + total);
        await new Promise(r => setTimeout(r, 200));
    }

    // 2) anything the proxy couldn't reach (network error, not a 404): try directly
    const retry = all.filter(u => results[u] && results[u].status === "ERR");
    let ri = 0;
    async function retryWorker() {
        while (ri < retry.length && !downloadAborted) {
            const u = retry[ri++];
            try {
                const r = await fetch(u);
                if (r.ok) results[u] = { status: r.status, buf: await r.arrayBuffer() };
                else results[u] = { status: r.status };
            } catch (e) {}
            setBar(Math.round(ri / retry.length * 100), "retrying " + ri + " / " + retry.length);
        }
    }
    await Promise.all(Array.from({ length: 8 }, retryWorker));

    // 3) build ONE zip of the successes (+ manifest of everything, incl. dead links)
    const zip = new JSZip();
    const usedNames = {};
    function uniqueName(url) {
        let name = url.split('/').pop().split('?')[0] || "file";
        if (usedNames[name] !== undefined) {
            usedNames[name]++;
            const dot = name.lastIndexOf('.');
            name = dot >= 0 ? name.slice(0, dot) + "_" + usedNames[name] + name.slice(dot) : name + "_" + usedNames[name];
        } else { usedNames[name] = 0; }
        return name;
    }
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = ["source,url,status,bytes,file"];
    let ok = 0;
    for (const u of all) {
        const r = results[u];
        if (r && r.buf) {
            const name = uniqueName(u);
            zip.file(name, r.buf, { compression: "STORE" });
            rows.push([q(sources[u] || ""), q(u), r.status, r.buf.byteLength, q(name)].join(","));
            ok++;
        } else {
            rows.push([q(sources[u] || ""), q(u), q(r ? r.status : "not checked"), 0, '""'].join(","));
        }
    }
    zip.file("manifest.csv", rows.join("\n"));

    if (ok === 0) {
        alert("No successful links to zip. Is the proxy running at " + proxy_url + "? Check the status column.");
    } else if (handle) {
        const writable = await handle.createWritable();
        await new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            zip.generateInternalStream({ type: "uint8array", streamFiles: true, compression: "STORE" })
                .on("data", (chunk, meta) => {
                    chain = chain.then(() => writable.write(chunk));
                    setBar(Math.round(meta.percent), "saving zip " + Math.round(meta.percent) + "%");
                })
                .on("error", reject)
                .on("end", () => chain.then(resolve, reject))
                .resume();
        });
        await writable.close();
    } else {
        const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (m) => {
            setBar(Math.round(m.percent), "zipping " + Math.round(m.percent) + "%");
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "assets.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    }

    bar.style.display = "none";
    barBtn.textContent = "download all";
    barBtn.onclick = downloadAll;
}

function closeControlsWindow(){
    var controls = document.getElementsByClassName("controls")[0];
    controls.style.display = "none";
}
class urlMaker {
  bitShift(def_id, sort_cat = 0) {
    return (def_id << 16) | (sort_cat & 0xFFFF);
  }

  hashIt(p1) {
    let loc2 = "";
    p1 = "W3 7r4Ck h4X0r3rs" + p1;
    for (let i = 0; i < p1.length; i++) {
      if ((i % 2) === 0) {
        loc2 += p1[i];
      } else {
        loc2 = p1[i] + loc2;
      }
    }
    return md5(loc2);
  }

  fetchCDNURL(p1, p2 = "/", p3 = true) {
    const contentURL = "https://ajcontent.akamaized.net/"
    let loc7 = null;
    let loc4 = null;
    let loc8 = null;
    let loc6 = "";
    let base = (baseUrl != "" ? baseUrl + "/" : "")
    const loc5 = version;

    if (loc5 !== "0" && p3) {
      loc6 = loc5 + "/";
    }

    const loc9 = p1.split("/", 2);
    if (loc5 === "0" && !p3) {
      loc4 = p1;
    } else if (loc9.length === 1) {
      loc4 = this.hashIt(loc9[0]);
    } else {
      loc8 = loc9.pop();
      loc4 = loc9.join("/") + "/" + this.hashIt(loc8);
    }

    if (p3) {
      if (loc5 === "0") {
        loc7 = contentURL + loc6 + base + p1 + "?v=1";
      } else {
        loc7 = contentURL + loc6 + base+ loc4 + "?v=2";
      }
    } else if (loc5 === "0") {
      loc7 = contentURL + loc6  + base+ p1;
    } else {
      loc7 = contentURL + loc6 + base + loc4;
    }

    return loc7;
  }
}
