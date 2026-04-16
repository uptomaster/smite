# Smite

**증강 칼바람 나락에서 최적의 선택을 추천하고, 그 근거를 데이터로 보여주는 의사결정 시스템**

---

## 🧠 Problem

증강 칼바람 나락에서는
매 라운드마다 빠르게 선택을 내려야 하지만,

* 어떤 증강이 좋은지 직관적으로 알기 어렵고
* 조합과 상황에 따라 성능이 달라지며
* 선택에 대한 근거를 확인하기 어렵다

→ 유저는 감에 의존한 선택을 하게 된다.

---

## 💡 Solution

Smite는

> 챔피언, 팀 조합, 상대 조합, 현재 선택 상태 + 실제 통계 데이터

를 기반으로

* **최적의 증강을 추천하고**
* **그 선택의 근거를 데이터로 함께 제공한다**

---

## ⚡ Key Features

### 🔥 BEST PICK (결정 지원)

* 현재 상황에서 가장 적합한 증강 1개 강조
* 즉시 선택 가능

---

### 📊 통계 기반 추천 (Data-driven)

* 승률 / 픽률 / 게임 수 기반 분석
* 단순 heuristic이 아닌 데이터 기반 추천

---

### 🧩 상태 기반 추천 (Stateful)

* 이미 선택한 증강 반영
* 라운드 진행에 따라 추천 변화

---

### ⚔️ 조합 분석

* 포킹 / 탱 부족 / 폭딜 등 자동 판단
* 상황 맞춤 추천 제공

---

### 📈 추천 근거 시각화

* 점수 구성 (winrate, synergy, context 등)
* 신뢰도 (games played 기반)

---

### ❌ 비추천 증강 제공

* 선택 시 효율이 낮은 옵션 제거

---

### 🛠 증강 기반 아이템 추천

* 선택한 증강과 어울리는 아이템 제안

---

## 🏗 System Architecture

```plaintext
Riot API → 데이터 수집 → 통계 집계 → 추천 엔진 → API → Frontend
```

---

## ⚙️ Tech Stack

### Backend

* FastAPI
* PostgreSQL
* Redis

### Data Pipeline

* Riot Match-V5 API
* Batch aggregation

### Frontend

* Next.js
* React

---

## 🧠 Recommendation Logic

```plaintext
score =
  base * 0.35 +
  augment_combo * 0.25 +
  context * 0.25 +
  strength * 0.15
```

### + Confidence

```plaintext
confidence = min(1.0, games_played / threshold)
```

* 데이터 수가 많을수록 신뢰도 상승

---

## ⚡ Performance

* Redis 캐싱
* 단일 쿼리 구조
* 평균 응답 속도 < 200ms

---

## 🎯 Goal

> 유저가 고민하지 않도록 추천하고,
> 그 선택을 납득할 수 있도록 근거를 제공하는 것

---

## 🚀 Future Work

* 데이터 수집 범위 확대
* 패치별 메타 반영
* 추천 모델 고도화
* UI 시각화 개선

---

## 👨‍💻 Author

* 데이터 기반 의사결정 시스템 설계 및 구현
