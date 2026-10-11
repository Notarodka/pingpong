let version = "1803"
let urls = []
const sources = {}
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
    version = localStorage.getItem("ver")
    baseUrl = localStorage.getItem("base")
    document.getElementById("url").value = localStorage.getItem("url")
    document.getElementById("ver").value = version
    document.getElementById("base").value = baseUrl
    var rep = JSON.parse(localStorage.getItem("rep"))
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

  fetch(proxy_url + "/proxy?url=" + encodeURIComponent(url), { method: 'GET',  "cors":"cors" })
    .then(res => {
      resDiv.innerText = res.status;
      if (res.ok) {
        resDiv.classList.add("success");
      } else {
        resDiv.classList.add("fail");
      }
    })
    .catch((res) => {
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
    });
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
    var baseUrl = document.getElementById("url").value;
    var rep_1 = document.getElementById("rep_1").value;
    var rep_2 = document.getElementById("rep_2").value;
    const urlMakerInstance = new urlMaker();
    for(var i = 0; i <= rep_2 - rep_1; i++){
        const seq = Number(rep_1) + i
        let url = urlMakerInstance.fetchCDNURL(baseUrl + seq)
        logSize += 1
        if (logSize <= 1001){
            makeDiv(url,version,baseUrl + seq)
        }
    }
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
    logSize = 0
}

let downloadAborted = false;

async function downloadAll() {
    if (urls.length === 0) return;

    downloadAborted = false;
    const CONCURRENCY = 5;
    const BATCH_SIZE = 500; // files per zip; one zip if you have fewer. Use Infinity to force a single zip.
    const total = urls.length;
    let completed = 0;
    let failed = 0;

    const bar = document.getElementById("dl-progress-bar");
    const barFill = document.getElementById("dl-bar-fill");
    const barLabel = document.getElementById("dl-bar-label");
    const barBtn = document.getElementById("download");
    bar.style.display = "flex";
    barBtn.textContent = "cancel";
    barBtn.onclick = () => { downloadAborted = true; };

    function updateBar(status) {
        const pct = Math.round((completed / total) * 100);
        barFill.style.width = pct + "%";
        barLabel.textContent = status || (completed + " / " + total + (failed > 0 ? "  (" + failed + " failed)" : ""));
    }
    updateBar();

    let zip = new JSZip();
    let inZip = 0;
    let rows = [];
    let parts = 0;
    const pendingSaves = [];
    const usedNames = {};
    function uniqueName(url) {
        let name = url.split('/').pop().split('?')[0] || "file";
        if (usedNames[name] !== undefined) {
            usedNames[name]++;
            const dot = name.lastIndexOf('.');
            name = dot >= 0
                ? name.slice(0, dot) + "_" + usedNames[name] + name.slice(dot)
                : name + "_" + usedNames[name];
        } else {
            usedNames[name] = 0;
        }
        return name;
    }
    function q(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }

    // swap in a fresh zip right away so workers keep going while the old one is built and saved
    function flush(final) {
        if (!final && inZip < BATCH_SIZE) return;
        if (rows.length === 0) return;
        const z = zip, r = rows;
        zip = new JSZip(); inZip = 0; rows = [];
        const name = (final && parts === 0) ? "assets.zip" : "assets_" + (++parts) + ".zip";
        pendingSaves.push(saveZip(z, r, name));
    }
    async function saveZip(z, r, name) {
        z.file("manifest.csv", "source,url,status,bytes,file\n" + r.join("\n"));
        const blob = await z.generateAsync({ type: "blob" }, (meta) => {
            barLabel.textContent = "zipping " + name + " " + meta.percent.toFixed(0) + "%";
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    }

    const queue = [...urls];
    async function worker() {
        while (queue.length > 0 && !downloadAborted) {
            const url = queue.shift();
            const src = sources[url] || "";
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("HTTP " + response.status);
                const buffer = await response.arrayBuffer();
                const name = uniqueName(url);
                zip.file(name, buffer);
                inZip++;
                rows.push([q(src), q(url), 200, buffer.byteLength, q(name)].join(","));
            } catch(e) {
                failed++;
                rows.push([q(src), q(url), q(e.message || "error"), 0, '""'].join(","));
            }
            completed++;
            updateBar();
            flush(false);
        }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    // runs even if cancelled, so nothing already downloaded is lost
    if (completed > failed) flush(true);
    await Promise.all(pendingSaves);

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
