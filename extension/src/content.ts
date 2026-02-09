// content.ts

// Icon SVG
const SPARKLES_ICON = `
<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-sparkle">
    <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.45.96a6 6 0 0 0 2.652 2.652l.96.45a.5.5 0 0 1 0 .94l-.96.45a6 6 0 0 0-2.652 2.652l-.45.96a.5.5 0 0 1-.94 0l-.45-.96a6 6 0 0 0-2.652-2.652l-.96-.45a.5.5 0 0 1 0-.94l.96-.45a6 6 0 0 0 2.652-2.652l.45-.96Z"></path>
    <path d="M12.924 10.612a.5.5 0 0 1 .86.467l-.155.43a3 3 0 0 0 1.286 1.286l.43.155a.5.5 0 0 1-.467.86l-.43-.155a3 3 0 0 0-1.286 1.286l-.155.43a.5.5 0 0 1-.86-.467l.155-.43a3 3 0 0 0-1.286-1.286l-.43-.155a.5.5 0 0 1 .467-.86l.43.155a3 3 0 0 0 1.286-1.286l.155-.43Z"></path>
</svg>
`;

function injectButton() {
  const titleInput = document.querySelector('input[name="pull_request[title]"]');
  if (!titleInput || document.getElementById('pr-please-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pr-please-btn';
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-primary ml-2 tooltipped tooltipped-n';
  btn.setAttribute('aria-label', 'Generate Title & Description with AI');
  btn.innerHTML = `${SPARKLES_ICON} Generate`;
  btn.style.marginLeft = '8px';
  btn.style.verticalAlign = 'middle';

  btn.addEventListener('click', handleGenerate);

  // Inject next to the input, or in the parent container
  // GitHub structure varies, usually there is a d-flex container or similar.
  // We'll append it after the input for now.
  titleInput.parentElement?.appendChild(btn);
}

async function handleGenerate(e: Event) {
  const btn = e.target as HTMLButtonElement;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Generating...';

  try {
    // Scrape Commits
    // On "New PR" page, commits are often in `.js-commits-list-item`
    // On "Existing PR" page, they are in a different tab, but we might just use the PR URL + .diff 
    // and let the background script fetch the commit messages from the API? 
    // No, we want to avoid GitHub API rate limits if possible, scraping is "free".
    // But scraping commits from "Files changed" tab is hard.
    // If we are on the "Create PR" page, the commits are listed at the bottom usually.
    
    const commitElements = document.querySelectorAll('.js-commits-list-item p.commit-title, .commit-message code a');
    const commits = Array.from(commitElements).map(el => el.textContent?.trim()).filter(Boolean) as string[];

    // Send to Background
    const prUrl = window.location.href.split('?')[0]; // Remove query params
    
    const response = await chrome.runtime.sendMessage({
      action: 'GENERATE_PR',
      commits,
      prUrl
    });

    if (response.error) {
      alert(`Error: ${response.error}`);
    } else {
      // Fill inputs
      const titleInput = document.querySelector('input[name="pull_request[title]"]') as HTMLInputElement;
      const bodyInput = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;

      if (titleInput && response.title) {
        titleInput.value = response.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      if (bodyInput && response.description) {
        bodyInput.value = response.description;
        bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

  } catch (err: any) {
    console.error(err);
    alert('Failed to generate PR content. Check console for details.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Observer for SPA navigation
const observer = new MutationObserver(() => {
  injectButton();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check
injectButton();
