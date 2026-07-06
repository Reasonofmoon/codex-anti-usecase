import os
import json
import urllib.request
import urllib.parse
import re

# GitHub Search API to search for trending AI agent, Claude Code, and coding assistant use cases.
# This script can be run on a cron job or scheduled task to continuously update the datasets.

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def get_github_repos(query):
    """
    Search GitHub repositories for a given query to discover use cases.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # In production, use GITHUB_TOKEN if available to prevent rate limits
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
        
    url = f"https://api.github.com/search/repositories?q={urllib.parse.quote(query)}&sort=stars&order=desc&per_page=5"
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get("items", [])
    except Exception as e:
        print(f"Error searching GitHub for '{query}': {e}")
        return []

def add_usecase_to_json(file_path, new_item):
    """
    Safely append a new use case to target json file if it doesn't already exist.
    """
    if not os.path.exists(file_path):
        data = []
    else:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = []
            
    # Check deduplication by slug
    existing_slugs = {item.get("slug") for item in data}
    if new_item["slug"] not in existing_slugs:
        data.append(new_item)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully added '{new_item['title']}' to {os.path.basename(file_path)}")
        return True
    return False

def run_update():
    print("Starting GitHub Open Source Use-Case Discovery...")
    
    # 1. Search for Claude Code and agy related resources
    repos = get_github_repos("claude code plugin OR antigravity cli")
    print(f"Found {len(repos)} potential repositories for use cases.")
    
    # Example parsing from discovered repositories
    # In real pipeline, we could fetch README or releases.
    # Here we simulate extracting a discovered usecase.
    for repo in repos:
        name = repo.get("name")
        desc = repo.get("description", "")
        html_url = repo.get("html_url")
        owner = repo.get("owner", {}).get("login")
        
        slug = f"github-{owner}-{name}".lower()
        
        # Determine target collection
        if "anti" in name.lower() or "anti" in desc.lower():
            target_file = os.path.join(DATA_DIR, "anti_usecases.json")
            category = "Security & Privacy"
            title = f"오픈소스 {name} 안티 패턴 분석"
            description = f"GitHub 오픈소스 {owner}/{name} 프로젝트 분석 중 식별된 {desc} 관련 안티 패턴 리스크입니다."
            insight = "오픈소스 모범 사례를 참고하여 예외 처리 및 샌드박스 보안 규칙을 보더 엄격하게 구성하십시오."
            item = {
                "slug": slug,
                "title": title,
                "description": description,
                "category": category,
                "tags": ["GitHub", "Anti-pattern", name],
                "insight": insight
            }
        elif "plugin" in name.lower() or "agy" in name.lower():
            target_file = os.path.join(DATA_DIR, "plugin_usecases.json")
            category = "Automation"
            title = f"{name} 플러그인 확장 기능"
            description = f"GitHub 오픈소스 {owner}/{name} 레포지토리에서 발굴한 플러그인 유스케이스: {desc}"
            insight = f"이 오픈소스 도구를 Claude Code에 추가 설치하여 `{name}` 워크플로우를 자동화하고 로컬 코드베이스와 연동해 보세요."
            item = {
                "slug": slug,
                "title": title,
                "description": description,
                "category": category,
                "tags": ["Plugin", "OpenSource", name],
                "insight": insight,
                "command": f"/plugin add {owner}/{name}"
            }
        else:
            target_file = os.path.join(DATA_DIR, "usecases.json")
            category = "Engineering"
            title = f"{name} 코딩 어시스턴트 활용"
            description = f"개발자 {owner}가 공개한 {name} 코딩 어시스턴트 워크플로우: {desc}"
            insight = "해당 오픈소스 아키텍처를 로컬 환경에 클론하여 맞춤형 자동화 스크립트로 고도화해 보십시오."
            item = {
                "slug": slug,
                "title": title,
                "description": description,
                "category": category,
                "tags": ["GitHub", "Agent", name],
                "insight": insight
            }
            
        add_usecase_to_json(target_file, item)

if __name__ == "__main__":
    run_update()
