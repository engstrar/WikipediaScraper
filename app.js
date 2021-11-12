// Setting the port number that will be used on the FLIP2 engr server
const port = 4203;

// Setting up Axios for help with requests
const axios = require("axios");

// Setting up Cheerio for help selecting HTML elements
const cheerio = require("cheerio");

// Setting up express
const express = require("express");
const app = express();

// Scraping Wikipedia
app.get("/", (req, res) => {
	// Wikipedia API base URL with unique query string from request
	const url = `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${req.query.page}?redirect=true`;
	console.log(url);

	axios(url)
		.then((response) => {
			// Saving the data received from Wikipedia for easy access
			const wikiData = response.data;

			// Object to store all page data in while scrapping
			const pageData = {};

			// Scraping the Title and Description
			getBasicInfo(wikiData.lead, pageData);

			// Scraping the introduction
			getIntro(wikiData.lead, pageData);

			// Scraping the Sections
			getSections(wikiData.remaining, pageData);

			// WORK IN PROGRESS: Scraping References
			getReferences(wikiData.remaining, pageData);

			// Returning JSON data to whoever requested it
			res.json(pageData);
		})
		// Error Handling
		.catch((error) => {
			handleError(error);
		});
});

// Communication on the server
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
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

			// Selecting all references
			let refs = $("li");
			let refNum = 1;
			references = {};

			refs.each(function () {
				references[refNum] = "";
				refNum++;
			});
			pageData.references = references;
		}
	}
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
