// T03_관리자_일일체크리스트.csv (크라이치즈버거 AX해커톤 주제2 데이터)를 그대로 옮긴 항목입니다.
// 백엔드의 t2_t03_manager_check_template 테이블과 같은 구조입니다.
export type ManagerCheckItem = {
  id: string
  section: string
  time: string
  task: string
  input: '온도(℃)' | '완료 체크'
  standard: string
}

export const managerChecklist: ManagerCheckItem[] = [
  { id: 'T03-01', section: '심부 온도', time: '오전 11:00', task: '햄버거 패티의 심부온도 측정', input: '온도(℃)', standard: '75℃ 이상' },
  { id: 'T03-02', section: '심부 온도', time: '오전 11:00', task: '치킨패티의 심부온도 측정', input: '온도(℃)', standard: '75℃ 이상' },
  { id: 'T03-03', section: '심부 온도', time: '오전 11:00', task: '치킨텐더의 심부온도 측정', input: '온도(℃)', standard: '75℃ 이상' },
  { id: 'T03-04', section: '심부 온도', time: '오전 11:00', task: '치즈소스 온도 측정', input: '온도(℃)', standard: '70℃ 이상' },
  { id: 'T03-05', section: '오픈', time: '출근 후', task: '입고 검수서 사인 / 보관상태 확인', input: '완료 체크', standard: '' },
  { id: 'T03-06', section: '오픈', time: '오픈 1시간 전', task: '그리들 예열 상태 / 구운양파 조리 상태 확인', input: '완료 체크', standard: '' },
  { id: 'T03-07', section: '오픈', time: '', task: '식재료 프랩 확인 (토마토/양파/양상추)', input: '완료 체크', standard: '' },
  { id: 'T03-08', section: '오픈', time: '', task: '치즈소스 중탕 확인', input: '완료 체크', standard: '' },
  { id: 'T03-09', section: '오픈', time: '오픈 30분 전', task: '튀김기 & 포장테이블 열선 확인', input: '완료 체크', standard: '' },
  { id: 'T03-10', section: '오픈', time: '오픈 10분 전', task: '포스, 키오스크, 호출 모니터 확인', input: '완료 체크', standard: '' },
  { id: 'T03-11', section: '오픈', time: '오픈 5분 전', task: '고객 동선 청결 상태 확인 (출입구 주변 / 홀 테이블)', input: '완료 체크', standard: '' },
  { id: 'T03-12', section: '오픈', time: '', task: '컨디먼트 바 점검 (탄산, 시럽, 비품, 조미료)', input: '완료 체크', standard: '' },
  { id: 'T03-13', section: '오픈', time: '오픈 1분전', task: '[오전 조회] 오늘의 목표 및 업무 분담. 매장 특이사항 공유(단체, 클레임 이슈)', input: '완료 체크', standard: '' },
  { id: 'T03-14', section: '오픈', time: '11:30 - 13:00', task: '(중요) 조리, 제공, 홀 위생 을 제외한 모든 업무를 배제하고 최상의 품질에 집중', input: '완료 체크', standard: '' },
  { id: 'T03-15', section: '피크 타임 중간', time: '14:00 - 17:00', task: '주간/월간 청소 & 프랩 보완', input: '완료 체크', standard: '' },
  { id: 'T03-16', section: '피크 타임 중간', time: '15:00 - 16:00', task: '**발주(식자재, 공산품)', input: '완료 체크', standard: '' },
  { id: 'T03-17', section: '중간 마감', time: '19:30 - 20:00', task: '중간 청소 시작(감자 계량대, 덤프, 집기류, 소스 밧드 교체)', input: '완료 체크', standard: '' },
  { id: 'T03-18', section: '중간 마감', time: '19:40', task: '케첩 펌프 세척', input: '완료 체크', standard: '' },
  { id: 'T03-19', section: '중간 마감', time: '19:30 - 20:00', task: '분리수거대 및 세면대 마감', input: '완료 체크', standard: '' },
  { id: 'T03-20', section: '중간 마감', time: '마감 1시간 전부터', task: '쉐이크 마감 및 기기청소', input: '완료 체크', standard: '' },
  { id: 'T03-21', section: '마감', time: '영업 종료 후', task: '남은 식자재 래핑 후 보관 가열기기 OFF(그리들, 튀김기, 워머기, 열선)', input: '완료 체크', standard: '' },
  { id: 'T03-22', section: '마감', time: '', task: '탄산음료 기계, 식기세척기, 건조기, 에어컨 OFF', input: '완료 체크', standard: '' },
  { id: 'T03-23', section: '마감', time: '', task: '키오스크 및 포스 마감&정산', input: '완료 체크', standard: '' },
  { id: 'T03-24', section: '마감', time: '', task: '홀 / 주방 바닥 청소 (쓸고 닦기)', input: '완료 체크', standard: '' },
  { id: 'T03-25', section: '마감', time: '', task: '메인 가스 차단, 냉/난방기, 출입구', input: '완료 체크', standard: '' },
]

export type ChecklistPhaseKey = 'open' | 'close'

// T03-01~14는 오픈, 나머지는 마감 체크리스트입니다.
export function phaseOf(item: ManagerCheckItem): ChecklistPhaseKey {
  return Number(item.id.slice(4)) <= 14 ? 'open' : 'close'
}

// "75℃ 이상" 같은 기준 문구에서 최소값을 꺼냅니다.
export function minimumOf(item: ManagerCheckItem) {
  const match = item.standard.match(/(-?\d+(?:\.\d+)?)\s*℃\s*이상/)
  return match ? Number(match[1]) : null
}

// CSV에서 시간이 비어 있으면 같은 구역의 바로 앞 항목과 같은 시간대입니다.
export function displayTimes(items: ManagerCheckItem[]) {
  const times = new Map<string, string>()
  let previous = { section: '', time: '' }
  for (const item of items) {
    const time = item.time || (item.section === previous.section ? previous.time : '')
    times.set(item.id, time)
    previous = { section: item.section, time }
  }
  return times
}
