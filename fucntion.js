let slideIndex = 0;
showSlides();

function showSlides() {
    let slides = document.getElementsByClassName("mySlides");
    let dots = document.getElementsByClassName("dot");
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > slides.length) { slideIndex = 1 }
    for (let i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex - 1].style.display = "block";
    dots[slideIndex - 1].className += " active";
    setTimeout(showSlides, 2000);
}

const imageUpload = document.getElementById('imageUpload');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const displayImageInfo = document.getElementById('displayImageInfo');
let img = new Image();
let imgData;

const MAX_CANVAS_WIDTH = 800;
const MAX_CANVAS_HEIGHT = 600;

imageUpload.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            img.onload = function () {
                const ratio = Math.min(MAX_CANVAS_WIDTH / img.width, MAX_CANVAS_HEIGHT / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                imgData = ctx.getImageData(0, 0, newWidth, newHeight);
                ctx.putImageData(imgData, 0, 0);
                displayImageInfo.innerHTML = `
                    <p>Width: ${img.width}px</p>
                    <p>Height: ${img.height}px</p>
                    <p>File size: ${(file.size / 1024).toFixed(2)} KB</p>
                `;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('brightness').addEventListener('input', applyFilters);
document.getElementById('contrast').addEventListener('input', applyFilters);
document.getElementById('saturation').addEventListener('input', applyFilters);

function applyFilters() {
    let brightness = parseFloat(document.getElementById('brightness').value);
    let contrast = parseFloat(document.getElementById('contrast').value);
    let saturation = parseFloat(document.getElementById('saturation').value);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
}

function applyNegative() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const intensityMax = 255;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = intensityMax - data[i];
        data[i + 1] = intensityMax - data[i + 1];
        data[i + 2] = intensityMax - data[i + 2];
    }
    ctx.putImageData(imageData, 0, 0);
}

function applyThreshold() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const thresholdValue = 128;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const newValue = avg > thresholdValue ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = newValue;
    }
    ctx.putImageData(imageData, 0, 0);
}

function applyLogarithmic() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const c = 255 / Math.log(256);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(c * Math.log(1 + data[i]));
        data[i + 1] = Math.floor(c * Math.log(1 + data[i + 1]));
        data[i + 2] = Math.floor(c * Math.log(1 + data[i + 2]));
        data[i] = Math.min(255, Math.max(0, data[i]));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
    }
    ctx.putImageData(imageData, 0, 0);
}

function compressImage() {
    const compressedDataURL = canvas.toDataURL('image/jpeg', 0.5);
    const link = document.createElement('a');
    link.href = compressedDataURL;
    link.download = 'compressed-image.jpg';
    link.click();
}

function adjustHue() {
    ctx.filter = 'hue-rotate(90deg)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
}

function applyBitPlaneSlicing() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const bitLevel = 7;
    const bitMask = 1 << bitLevel;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] & bitMask) ? 255 : 0;
        data[i + 1] = (data[i + 1] & bitMask) ? 255 : 0;
        data[i + 2] = (data[i + 2] & bitMask) ? 255 : 0;
    }
    ctx.putImageData(imageData, 0, 0);
}

function applyHistogramEqualization() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const hist = new Array(256).fill(0);
    const cumulativeHist = new Array(256).fill(0);
    const newImageData = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const avg = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
        hist[avg]++;
    }

    cumulativeHist[0] = hist[0];
    for (let i = 1; i < 256; i++) {
        cumulativeHist[i] = cumulativeHist[i - 1] + hist[i];
    }

    const totalPixels = data.length / 4;
    const scale = 255 / totalPixels;

    for (let i = 0; i < data.length; i += 4) {
        const avg = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
        const newValue = Math.floor(cumulativeHist[avg] * scale);

        newImageData[i] = newImageData[i + 1] = newImageData[i + 2] = newValue;
        newImageData[i + 3] = 255;
    }

    for (let i = 0; i < newImageData.length; i++) {
        data[i] = newImageData[i];
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyPowerLaw() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const c = 1;
    const y = 0.5;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(c * Math.pow(data[i] / 255, y) * 255);
        data[i + 1] = Math.floor(c * Math.pow(data[i + 1] / 255, y) * 255);
        data[i + 2] = Math.floor(c * Math.pow(data[i + 2] / 255, y) * 255);

        data[i] = Math.min(255, Math.max(0, data[i]));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
    }
    ctx.putImageData(imageData, 0, 0);
}
