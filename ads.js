(function() {
    const smartlinkUrl = "https://araplhn.org/4/6c132df3bd849b18e17e6b11ef58f92a";
    
    const cooldownMinutes = 10; 
    const storageKey = "ad_smartlink_last_shown";

    function triggerSmartlink() {
        const lastShown = localStorage.getItem(storageKey);
        const now = Date.now();
        const cooldownMs = cooldownMinutes * 60 * 1000;

        if (!lastShown || (now - parseInt(lastShown, 10)) > cooldownMs) {
            const newTab = window.open(smartlinkUrl, "_blank");
            
            if (newTab) {
                newTab.blur();
                window.focus();
                
                localStorage.setItem(storageKey, now.toString());
            }
        }
    }

document.addEventListener("click", triggerSmartlink);
})();