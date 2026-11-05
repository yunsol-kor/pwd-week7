-- 최초 한 번, 비어 있는 실습 테이블에만 원본 맛집 3건을 입력합니다.
-- 다시 실행해도 기존 맛집을 삭제하거나 덮어쓰지 않습니다.
do $$
begin
  if not exists (select 1 from public.restaurants) then
    perform public.reset_restaurant_demo_data();
  end if;
end;
$$;
