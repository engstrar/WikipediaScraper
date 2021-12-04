// Setting the port number
const port = process.env.PORT || 4203;

// Setting up Axios for help with requests
const axios = require("axios");

// Setting up Cheerio for help selecting HTML elements
const cheerio = require("cheerio");

// Setting up express
const express = require("express");
const app = express();

// Setting up cors module
const cors = require("cors");
app.use(cors());

// Scraping Wikipedia
app.get("/", (req, res) => {
	// Wikipedia API base URL with unique query string from request
	const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${req.query.page}?redirect=true`;
	const wikiUrl = `https://en.wikipedia.org/wiki/${req.query.page}`;

	const wikiRequest = axios.get(wikiApiUrl);
	const imgRequest = axios.get(wikiUrl);

	const errMsg =
		"Page could not be found, please try again. See https://github.com/engstrar/WikipediaScraper for more info.";

	// If the user did not provide a page to scrape
	if (!req.query.page) {
		res.json({
			Error: errMsg,
		});
	} else {
		axios
			.all([wikiRequest, imgRequest])
			.then(
				axios.spread((...responses) => {
					// Saving the data received from Wikipedia for easy access
					const wikiData = responses[0].data;
					const wikiHTML = responses[1].data;
					const imgData = cheerio.load(wikiHTML);

					// Object to store all page data in while scrapping
					const pageData = {};

					// Scraping Wikipedia page data
					getBasicInfo(wikiData.lead, pageData);
					getIntro(wikiData.lead, pageData);
					getSections(wikiData.remaining, pageData);
					getImages(imgData, pageData);
					getReferences(wikiData.remaining, pageData);

					// Returning JSON data to whoever requested it
					res.json(pageData);
				})
			)
			// Error Handling
			.catch((error) => {
				handleError(error);
				res.json({ Error: errMsg });
			});
	}
});

// Communication on the server
app.listen(port, () => {
	console.log(`LIVE @ http://localhost:${port}/`);
});

// Helper functions for scraping data
function getBasicInfo(wikiData, pageData) {
	// Scraping the Page Title
	pageData.title = wikiData.displaytitle;
	// Scraping the Description
	pageData.Description = wikiData.description;
}

function getIntro(wikiData, pageData) {
	// Scraping Intro HTML data using Cheerio
	const html = wikiData.sections[0].text;
	let intro = scrapeText(html);

	// Adding the intro to pageData
	pageData.intro = intro;
}

function getSections(wikiData, pageData) {
	// Saving all sections and the current section for easy access
	let sections = wikiData.sections;
	let currSection = "";
	let currSubSection = "";

	// Iterating through all section
	for (let section of sections) {
		// We do not want to scrape the sections at the end of the page
		const doNotScrape = [
			"See also",
			"References",
			"External links",
			"Notes",
			"Further reading",
		];
		if (doNotScrape.includes(section.line)) {
			break;
		}

		// Add all sections to pageData
		if (section.toclevel == "1") {
			// This is a major section
			let sectionTitle = section.line;
			currSection = sectionTitle;
			pageData[currSection] = {};

			// Scraping Section's Intro HTML data using Cheerio
			const html = section.text;
			let intro = scrapeText(html);

			// Adding the section's intro to pageData
			pageData[currSection].intro = intro;
		} else if (section.toclevel == "2") {
			// This is a sub-section
			let sectionTitle = section.line;
			currSubSection = sectionTitle;
			pageData[currSection][currSubSection] = {};

			// Scraping sub-section HTML data using Cheerio
			const html = section.text;
			let subSection = scrapeText(html);

			// Adding subsection to pageData
			pageData[currSection][currSubSection].intro = subSection;
		} else {
			// This is a sub-sub-section
			let sectionTitle = section.line;

			// Scraping the sub-sub-section HTML data using Cheerio
			const html = section.text;
			let subSubSection = scrapeText(html);

			pageData[currSection][currSubSection][sectionTitle] = subSubSection;
		}
	}
}

function getReferences(wikiData, pageData) {
	// Finding the References Section
	let sections = wikiData.sections;
	for (let section of sections) {
		if (section.line == "References") {
			// Scraping HTML with Cheerio
			const html = section.text;
			const $ = cheerio.load(html);

			// Selecting and adding each reference to a dictionary
			let refs = $("li");
			let refNum = 1;
			references = {};

			refs.each(function () {
				references[refNum] = $(this).text();
				refNum++;
			});

			// Adding all references scraped to pageData
			pageData.references = references;
		}
	}
}

function getImages($, pageData) {
	let imgs = {};
	let imageCounter = 1;
	const images = $("#bodyContent").find("img");
	images.each(function () {
		let src = `https:${$(this).attr("src")}`;
		let alt = $(this).attr("alt");
		// Filter out useless images (icons, logos, etc)
		if (src.includes(".jpg") || src.includes(".JPG")) {
			imgs[imageCounter] = cleanImageUrl(src);
			imageCounter++;
		}
	});

	// Add image links to pageData
	pageData.imgs = imgs;
}

function cleanImageUrl(url) {
	// Remove thumbnail tag
	url = url.replace("/thumb/", "/");
	// Remove cropping at end of URL
	url = url.substring(0, url.indexOf(".jpg") + 4 || url.indexOf(".JPG") + 4);
	// Return cleaned URL
	return url;
}

function scrapeText(html) {
	// Scraping HTML data using Cheerio
	const $ = cheerio.load(html);

	// Selecting all of the paragraph elements
	let paragraphs = $("p");

	// Returning all combined all paragraphs
	return combineParagraphs($, paragraphs);
}

function combineParagraphs($, paragraphs) {
	// Combining all paragraphs into single variable that is returned
	let combined = "";
	paragraphs.each(function () {
		combined += $(this).text();
	});
	return combined;
}

// Error Handling Function
function handleError(error) {
	if (error.response) {
		// Request made and server responded
		console.log(error.response.data);
		console.log(error.response.status);
		console.log(error.response.headers);
	} else if (error.request) {
		// The request was made but no response was received
		console.log(error.request);
	} else {
		// Something happened in setting up the request that triggered an Error
		console.log("Error", error.message);
	}
}
