// // npm install axios form-data

// const fs = require('fs');
// const axios = require('axios');
// const FormData = require('form-data');

// // WordPress Configuration
// const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
// const USERNAME = 'Emma Harlow';
// const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
// const MIN_DESCRIPTION_LENGTH = 200;
// const JSON_FILE_PATH = './hlRecipesPosts.json';

// // Google AdSense Code
// const ADSENSE_CODE = `
// <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5509961066897132"
//      crossorigin="anonymous"></script>
// <ins class="adsbygoogle"
//      style="display:block; text-align:center;"
//      data-ad-layout="in-article"
//      data-ad-format="fluid"
//      data-ad-client="ca-pub-5509961066897132"
//      data-ad-slot="2762560982"></ins>
// <script>
//      (adsbygoogle = window.adsbygoogle || []).push({});
// </script>
// `;

// // Statistics
// let stats = {
//   totalPosts: 0,
//   createdPosts: 0,
//   skippedPosts: 0,
//   failedPosts: 0
// };

// const wpApi = axios.create({
//   baseURL: WORDPRESS_URL,
//   auth: {
//     username: USERNAME,
//     password: PASSWORD
//   }
// });

// function getFirstSentence(text) {
//   const sentenceMatch = text.match(/^.*?[.!?](?=\s|$)/);
//   return sentenceMatch ? sentenceMatch[0] : null;
// }

// function generateTitle(description, originalTitle) {
//   const useFirstSentence = Math.random() < 0.9;
//   if (useFirstSentence) {
//     const firstSentence = getFirstSentence(description);
//     if (firstSentence) return firstSentence;
//   }
//   return originalTitle || 'Untitled Post';
// }

// function insertAds(content) {
//   const paragraphs = content.split('\n\n');
//   const startPosition = 0;
//   const middlePosition = Math.floor(paragraphs.length / 2);
//   const endPosition = paragraphs.length;
  
//   paragraphs.splice(startPosition, 0, ADSENSE_CODE);
//   paragraphs.splice(middlePosition + 1, 0, ADSENSE_CODE);
//   paragraphs.splice(endPosition + 2, 0, ADSENSE_CODE);
  
//   return paragraphs.join('\n\n');
// }

// function logStats() {
//   console.log(`\n📊 STATISTICS:`);
//   console.log(`├── Total posts to process: ${stats.totalPosts}`);
//   console.log(`├── Successfully created: ${stats.createdPosts}`);
//   console.log(`├── Skipped (short content): ${stats.skippedPosts}`);
//   console.log(`├── Failed: ${stats.failedPosts}`);
//   console.log(`└── Progress: ${Math.round((stats.createdPosts + stats.skippedPosts + stats.failedPosts) / stats.totalPosts * 100)}% complete\n`);
// }

// async function uploadImage(imageUrl, title) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: 'stream' });
//     const form = new FormData();
//     form.append('file', response.data, {
//       filename: `${title.replace(/\s+/g, '-').toLowerCase()}.jpg`,
//       contentType: 'image/jpeg'
//     });
//     form.append('title', title);
//     form.append('status', 'publish');
    
//     const uploadResponse = await wpApi.post('/wp/v2/media', form, {
//       headers: {
//         ...form.getHeaders(),
//         'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '-').toLowerCase()}.jpg"`
//       },
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity
//     });
    
//     return uploadResponse.data.id;
//   } catch (error) {
//     console.error('❌ Error uploading image:', error.message);
//     return null;
//   }
// }

// async function createPost(postData, index) {
//   try {
//     if (!postData.Description || postData.Description.length < MIN_DESCRIPTION_LENGTH) {
//       console.log(`⏭ [${index+1}/${stats.totalPosts}] Skipping: "${postData.Title}" - Description too short`);
//       stats.skippedPosts++;
//       logStats();
//       return null;
//     }

//     let featured_media = null;
    
//     if (postData.Picture) {
//       featured_media = await uploadImage(postData.Picture, postData.Title || 'Post Image');
//     }
    
//     const postTitle = generateTitle(postData.Description, postData.Title);
//     const contentWithAds = insertAds(postData.Description);
    
//     const postContent = {
//       title: postTitle,
//       content: contentWithAds,
//       status: 'publish',
//       featured_media: featured_media,
//     };
    
//     const response = await wpApi.post('/wp/v2/posts', postContent);
//     stats.createdPosts++;
//     console.log(`✅ [${index+1}/${stats.totalPosts}] Created: "${postTitle}" - ${response.data.link}`);
//     logStats();
//     return response.data;
//   } catch (error) {
//     stats.failedPosts++;
//     console.error(`❌ [${index+1}/${stats.totalPosts}] Error creating post:`, error.message);
//     logStats();
//     return null;
//   }
// }

// async function processJSON() {
//   try {
//     console.log('🚀 Starting WordPress post creation process...');
    
//     const rawData = fs.readFileSync(JSON_FILE_PATH);
//     const posts = JSON.parse(rawData);
//     stats.totalPosts = posts.length;
    
//     console.log(`📁 Found ${stats.totalPosts} posts to process`);
//     logStats();
    
//     for (let i = 0; i < posts.length; i++) {
//       await createPost(posts[i], i);
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
    
//     console.log('🎉 All posts processed! Final statistics:');
//     logStats();
//   } catch (error) {
//     console.error('❌ Error processing JSON file:', error.message);
//   }
// }

// processJSON();


// npm install axios form-data

const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// WordPress Configuration
const WORDPRESS_URL = 'https://uprecipes.blog/wp-json';
const USERNAME = 'Emma Harlow';
const PASSWORD = 'jtrD lQPs eqsF xNeO tcun G4bq';
const MIN_DESCRIPTION_LENGTH = 200;
const JSON_FILE_PATH = './hlRecipesPosts.json';



// AdSense Code
const ADSENSE_BLOCK = `<!-- wp:html -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5509961066897132"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-5509961066897132"
     data-ad-slot="2762560982"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
<!-- /wp:html -->`;

// Statistics
let stats = {
  totalPosts: 0,
  createdPosts: 0,
  skippedPosts: 0,
  failedPosts: 0
};

const wpApi = axios.create({
  baseURL: WORDPRESS_URL,
  headers: {
    'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
  }
});

function cleanText(text) {
  if (!text) return '';
  // Remove quotes and trim whitespace
  return text.toString().replace(/^["']+|["']+$/g, '').trim();
}

function generateTitle(description, originalTitle) {
  const cleanDesc = cleanText(description);
  const cleanTitle = cleanText(originalTitle);
  
  if (!cleanDesc) return cleanTitle || 'Untitled Post';
  
  // First sentence logic
  const firstSentence = cleanDesc.match(/^.*?[.!?](?=\s|$)/)?.[0];
  if (firstSentence && firstSentence.split(/\s+/).length > 3) {
    return firstSentence;
  }
  
  // First 6 words fallback
  const words = cleanDesc.split(/\s+/).slice(0, 6);
  return words.join(' ');
}

function formatContent(content) {
  const cleanContent = cleanText(content);
  // Preserve all original line breaks
  const lines = cleanContent.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => 
    `<!-- wp:paragraph -->
<p>${line}</p>
<!-- /wp:paragraph -->`
  ).join('\n');
}

function insertAds(content) {
  const formattedContent = formatContent(content);
  const contentBlocks = formattedContent.split(/(<!-- \/wp:paragraph -->)/g);
  
  // Insert ads at start, middle, and end
  const adPositions = [
    0,
    Math.floor(contentBlocks.length / 2),
    contentBlocks.length
  ];
  
  // Insert ads (working backwards to avoid index issues)
  const result = [...contentBlocks];
  adPositions.sort((a,b) => b-a).forEach(pos => {
    result.splice(pos, 0, ADSENSE_BLOCK);
  });
  
  return result.join('\n');
}

async function uploadImage(imageUrl, title) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    const form = new FormData();
    form.append('file', response.data, {
      filename: `${cleanText(title).replace(/\s+/g, '-').toLowerCase()}.jpg`,
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await wpApi.post('/wp/v2/media', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Disposition': `attachment; filename="${cleanText(title).replace(/\s+/g, '-').toLowerCase()}.jpg"`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    return uploadResponse.data.id;
  } catch (error) {
    console.error('❌ Image upload error:', error.response?.data || error.message);
    return null;
  }
}

async function createPost(postData, index) {
  try {
    const description = cleanText(postData.Description);
    if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
      console.log(`⏭ [${index+1}/${stats.totalPosts}] Skipping: Description too short`);
      stats.skippedPosts++;
      return null;
    }

    const title = generateTitle(description, postData.Title);
    let featured_media = null;
    
    if (postData.Picture) {
      featured_media = await uploadImage(postData.Picture, title);
      if (!featured_media) {
        console.log(`⚠️ [${index+1}/${stats.totalPosts}] Proceeding without featured image`);
      }
    }
    
    const postContent = {
      title: title,
      content: insertAds(description),
      status: 'publish',
      featured_media: featured_media
    };
    
    const response = await wpApi.post('/wp/v2/posts', postContent);
    stats.createdPosts++;
    console.log(`✅ [${index+1}/${stats.totalPosts}] Created: "${title}"`);
    return response.data;
  } catch (error) {
    stats.failedPosts++;
    console.error(`❌ [${index+1}/${stats.totalPosts}] Error:`, error.response?.data || error.message);
    return null;
  } finally {
    logStats();
  }
}

function logStats() {
  console.log(`\n📊 STATISTICS:`);
  console.log(`├── Total: ${stats.totalPosts}`);
  console.log(`├── Created: ${stats.createdPosts}`);
  console.log(`├── Skipped: ${stats.skippedPosts}`);
  console.log(`├── Failed: ${stats.failedPosts}`);
  console.log(`└── Progress: ${Math.round((stats.createdPosts + stats.skippedPosts + stats.failedPosts) / stats.totalPosts * 100)}%`);
}

async function processJSON() {
  try {
    console.log('🚀 Starting post creation...');
    const rawData = fs.readFileSync(JSON_FILE_PATH);
    const posts = JSON.parse(rawData);
    stats.totalPosts = posts.length;
    
    console.log(`📁 Found ${stats.totalPosts} posts`);
    logStats();
    
    for (let i = 0; i < posts.length; i++) {
      await createPost(posts[i], i);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }
    
    console.log('🎉 All posts processed!');
    logStats();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

processJSON();