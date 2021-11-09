// Setting the port number that will be used on the FLIP2 engr server
const port = process.env.port;

// Setting up Axios for help with requests
const axios = require("axios");

// Setting up Cheerio for help selecting HTML elements
const cheerio = require("cheerio");

// Setting up express
const express = require("express");
const app = express();

// Setting up fs for file system access
// const fs = require("fs");

// Testing the Reformatting of the data to better match JSON
app.get("/", (req, res) => {
	// Base Wikipedia URL
	const wikipediaUrl = "https://en.wikipedia.org/wiki/";

	const url = `https://en.wikipedia.org/wiki/${req.query.page}`;

	axios(url)
		.then((response) => {
			// Requesting Wikipedia page's HTML using Cheerio
			const html = response.data;
			const $ = cheerio.load(html);

			// Object to store all page data in while scrapping
			const pageData = {};

			/*
            Selecting the Title of the page and adding it to the
            pageData object.
            */

			// Selecting the page title & adding it to page Data
			const title = $(".firstHeading").text();
			pageData.title = title;

			/*
			Selecting all of the quick facts provided on the page.
			Each quick fact is stored in an object keyed "quickFacts" 
			within pageData. This allows for iteration through all 
			quick facts or for the selection of individual  quick facts.
			*/

			// Scraping and formatting the quick facts
			const factsTable = $(".infobox-label");

			// Array for storing the quick facts
			const quickFacts = {};

			// Selecting the fact & data for each quick fact
			// and adding it to quickFacts
			factsTable.each(function () {
				const fact = $(this).text();
				const data = $(this).next().text();
				quickFacts[fact] = data;
			});

			// Adding the quickFacts to pageData under the key "quickFacts"
			pageData.quickFacts = quickFacts;

			/*
			Selecting the paragraphs that make up the introduction
			on the page and storing the text in pageData as "intro"
			*/

			// Selecting the first paragraph of the intro
			let introParagraph = $(".infobox.vcard").next();

			// Variable to store the intro paragraphs in
			let intro = "";

			// Storing each paragraph of text to intro
			while (introParagraph.is("p")) {
				intro += introParagraph.text();
				introParagraph = introParagraph.next();
			}

			// Adding the intro to the pageData under the key "intro"
			pageData.intro = intro;

			/*
			Selecting each section of the page and its corresponding
			information.
			*/

			// Selecting all of the sections
			const sections = $(".mw-headline");

			let currSection = "";

			sections.each(function () {
				// All Wikipedia pages include a variety of resource
				// sections at the bottom that we are not going to be
				// scraping the first section is always "See also." This
				// will end the section scraper at this section
				if ($(this).text() == "See also") {
					return false;
				}

				// If the heading is a h2 then this is a Major Section,
				// otherwise this is a subsection. For each major section
				// start a new object to store each of the subsections in.
				if ($(this).parent().is("h2")) {
					// Creating a new section in pageData for this section
					currSection = $(this).text();
					pageData[$(this).text()] = {};
					// Some sections will have an intro paragraph, others will not
					// If the section has an intro paragraph scrape it and save it to
					// the section object under the key "intro."
					let intro = "";
					// Finding the first paragraph of the section
					let element = $(this).parent().next();
					while (!element.is("p")) {
						// If there is not an intro paragraph the first section will
						// be a subsection "h2" heading. If there is not an intro
						// then add an empty intro to the currSection object and move
						// onto the next section.
						if (element.is("h3")) {
							currSection.intro = intro;
							return;
						}
						// Otherwise keep going until a paragraph is found
						element = element.next();
					}
					// Storing each paragraph of the intro to text
					while (element.is("p")) {
						intro += element.text();
						element = element.next();
					}
					// Adding the introduction to the currSection object
					pageData[currSection].intro = intro;
				} else {
					// Save the subsections name and create a variable to store its text
					subSection = $(this).text();
					text = "";

					// Finding the first paragraph of the subsection
					let element = $(this).parent().next();

					while (!element.is("p")) {
						element = element.next();
					}

					// Storing each paragraph of the section to text
					while (element.is("p")) {
						text += element.text();
						element = element.next();
					}

					// Adding the subsection to its appropriate section within pageData
					pageData[currSection][subSection] = text;
				}
			});

			/*
			WORK IN PROGRESS: Selecting Images For
			*/

			// // Selecting all of the images that are within the main body
			// // of the page where the content is.
			// const imgs = $("#bodyContent").find("img");

			// // Variable to store the image data
			// let images = [];

			// imgs.each(function () {
			// 	let src = $(this).attr("src");
			// 	let alt = $(this).attr("alt");

			// 	// NEED to filter out useless images
			// 	if (src.includes(".jpeg")) {
			// 		console.log(src);
			// 	}

			// 	// NEED to collect captions

			// 	images.push({ src: src, alt: alt });
			// });

			// pageData.push({ images: images });

			/*
			Selecting each source and adding it to the pageData under
			the key "references." The added references can be found
			under the key corresponding to their reference number on the
			page (i.e. {"1": "Australian Bureau of Statistics..."}).
			*/

			// Selecting each list element from the references list
			let refs = $(".references").find("li");

			// Variable for the reference number counter
			let refNum = 1;

			// Variable for the references to be stored
			let references = {};

			// Scraping the relevant data for each reference
			refs.each(function () {
				references[refNum] = $(this).text();
				refNum++;
			});

			// Adding the references to the pageData under the key
			// "references"
			pageData.references = references;

			/*
            Last, but most important... converting the scraped data to JSON and 
			sending the scrapped page data back to whomever requested it.
            */
			res.json(pageData);
		})

		.catch(console.error);
});

// Communication on the server
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
