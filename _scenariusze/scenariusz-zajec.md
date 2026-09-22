# PAS 2026 — Rezerwacje obiektów „Ośrodek Sosna”

Scenariusz dla prowadzącego: trzy wykłady po 90 minut oraz dwanaście bloków laboratoryjnych po 45 minut, zgrupowanych w trzy spotkania po 180 minut dydaktycznych. Przerwy organizacyjne są poza tym bilansem. Układ odpowiada obecnym plikom PAS; nie tworzymy sześciu dodatkowych wykładów.

## Niezależny projekt i punkt startowy

Grupa otrzymuje własny opis dziedziny i własne dane. Nie potrzebuje projektu bazy z PRBA ani znajomości SQL z RSOD. Przed pierwszym użyciem bazy prowadzący wyjaśnia minimum: tabela, identyfikator, powiązanie i zapis transakcyjny. Student zna podstawy Pythona; jeśli nie, potrzebny jest wcześniejszy materiał wyrównawczy.

**Brief dla studentów:** „W fikcyjnym ośrodku Alfa i Bravo planują zajęcia w tych samych obiektach. Telefoniczne uzgodnienia przestają wystarczać. Budujecie aplikację, która pokazuje rezerwacje i odrzuca konflikt, a użytkownik może zarządzać tylko rezerwacjami swojej jednostki”.

Zachowujemy obecne nazwy zasobów z materiałów: `poligony`, `jednostki`, `rezerwacje`. „Poligon” jest tu dydaktyczną nazwą obiektu szkoleniowego. Nie są potrzebne mapy, prawdziwe lokalizacje ani dane rzeczywistych jednostek. Scenariusz nie wymaga żadnej integracji z pozostałymi kursami.

### Dane i reguły do rozdania

- Obiekt P1: „Plac treningowy”, dostępny. Obiekt P2: „Sala symulatorów”, niedostępny z powodu przeglądu.
- Jednostki A: „Alfa”, B: „Bravo”.
- Konta demonstracyjne: użytkownik Alfa przypisany do A; użytkownik Bravo przypisany do B; planista obsługujący cały ośrodek. Hasła ustawiane wyłącznie w lokalnym środowisku ćwiczenia.
- T oznacza jutrzejszą datę ustaloną na początku spotkania. Wszystkie czasy mają tę samą, jawną strefę; nie mieszamy czasów lokalnych bez strefy z czasami UTC.
- Stan kontrolny: rezerwacja R1, P1, A, T 08:00–10:00. Początkowy blok CRUD może zaczynać od pustej listy; od bloku 4 odtwarzamy R1 przed testowaniem konfliktów.
- Rezerwacja musi wskazywać istniejący, dostępny obiekt i istniejącą jednostkę. Początek jest wcześniejszy niż koniec; nowe rezerwacje nie zaczynają się w przeszłości.
- Dwa przedziały na tym samym obiekcie kolidują, gdy `new_start < old_end` i `new_end > old_start`. Styk 10:00–11:00 z końcem R1 o 10:00 jest dozwolony.
- Konto użytkownika nie może samo przyznać sobie roli planisty. Uprawnienia sprawdza serwer. Zmiana identyfikatora w żądaniu nie może umożliwić przejęcia cudzej rezerwacji.
- W podstawowej wersji nie ma zatwierdzania wieloetapowego ani cyklicznych rezerwacji. Usunięcie rezerwacji nie oznacza usunięcia jednostki lub obiektu.

## Metoda pracy

Wykład: 8 min quiz od drugiego spotkania (na pierwszym diagnoza), 10 min sytuacja, 17 min teoria, 10 min zadanie A, 20 min demonstracja/zadanie B, 15 min nowe zdarzenie, 10 min omówienie.

Blok laboratoryjny: 5 min przewidywanie, 8 min demonstracja, 20 min implementacja w parze, 7 min próby odbiorcze, 5 min indywidualne uzasadnienie. W pierwszym bloku każdego kolejnego spotkania dwa krótkie pytania diagnostyczne zastępują przewidywanie. W parach zamiana osoby piszącej i sprawdzającej co blok.

Cztery godziny dydaktyczne (180 minut) pracy nad kilkoma technologiami wymagają przygotowanego środowiska i punktów wznowienia. Przed każdym spotkaniem prowadzący przygotowuje działający stan z poprzedniego. Poniższy dokument określa scenariusze i odbiór; nie dostarcza jeszcze tych archiwów kodu ani nowego backendu.

## Wykład 1 — Co się dzieje po kliknięciu „Rezerwuj”?

Materiał: [Architektura i HTTP](../lectures/spotkanie1.qmd).

**Otwarcie:** użytkownik ma pusty ekran. Czy brak danych oznacza brak rezerwacji, błąd serwera czy brak odpowiedzi sieci?

**A:** rozrysuj przepływ przeglądarka → API → baza → API → przeglądarka. Nazwij odpowiedzialność każdego elementu. Oczekiwane: HTML/JS nie jest bazą, odpowiedź HTTP nie jest bezpośrednim odczytem pliku SQLite przez przeglądarkę.

**B:** zaproponuj żądanie odczytu rezerwacji i żądanie utworzenia nowej. Wskaż metodę, adres, dane i oczekiwany wynik. Porównaj pustą listę ze wskazaniem nieistniejącego pojedynczego zasobu.

**Nowe zdarzenie:** po wysłaniu rezerwacji znika odpowiedź. Student powinien powiedzieć „nie znam wyniku”, a nie „na pewno się nie zapisało”. Mechanizm bezpiecznych ponowień zostawiamy jako rozszerzenie.

**Odbiór:** student rozróżnia stan systemu od wiedzy klienta o tym stanie.

## Wykład 2 — Kto może zmienić rezerwację?

Materiał: [API i bezpieczeństwo](../lectures/spotkanie2.qmd).

**Otwarcie:** Alfa zmienia w adresie identyfikator rezerwacji na należący do Bravo. Przycisk był ukryty, ale żądanie dało się wysłać ręcznie.

**A:** ułóż tabelę uprawnień dla listowania, tworzenia i usuwania: użytkownik swojej jednostki oraz planista wszystkich jednostek. Oczekiwane: rola i własność obiektu sprawdzane po stronie serwera.

**B:** przyporządkuj przypadki do odpowiedzi API: brak uwierzytelnienia, brak uprawnień, niepoprawny przedział, konflikt rezerwacji. Przyjmujemy odpowiednio 401, 403, 422, 409 jako kontrakt tego projektu; brak pojedynczego zasobu to 404.

**Nowe zdarzenie:** użytkownik wysyła `rola=planista` przy rejestracji. Oczekiwane: serwer nie ufa tej deklaracji, sam ustala uprawnienia nowego konta.

**Odbiór:** student rozróżnia identyfikację użytkownika od sprawdzenia, czy wolno mu wykonać konkretną operację.

## Wykład 3 — Działało na moim komputerze

Materiał: [Skalowalność i wdrażanie](../lectures/spotkanie3.qmd).

**Otwarcie:** dwa niezależne serwery mają po własnej kopii SQLite. Alfa widzi rezerwację, Bravo jej nie widzi.

**A:** wskaż, które elementy stanu trzeba współdzielić lub synchronizować, aby mówić o jednym systemie. Oczekiwane: dodanie instancji aplikacji nie scala lokalnych plików danych.

**B:** zaprojektuj próbę trwałości: utwórz rezerwację, odtwórz kontener z zachowanym wolumenem, odczytaj ją ponownie. Odróżnij zatrzymanie kontenera, jego usunięcie i usunięcie wolumenu. Próba dotyczy wyłącznie środowiska ćwiczeniowego.

**Nowe zdarzenie:** dwa żądania przeszły osobny odczyt „brak konfliktu”. Oczekiwane: warunek musi być egzekwowany atomowo, a klient otrzymać rozstrzygnięcie konfliktu. Cache ani JWT nie rozwiązują tego problemu.

**Odbiór:** student potrafi opisać ograniczenia demonstratora z pojedynczą instancją i SQLite, bez deklarowania nieprzetestowanej odporności systemu.

## Laboratorium — spotkanie 1: od zera do CRUD

Materiał: [Cztery części spotkania 1](../cwiczenia/spotkanie1.qmd).

### Blok 1 — Czy serwer odpowiada?

**Sytuacja:** klient nie wie, czy aplikacja działa. **A:** uruchom przygotowane środowisko i odczytaj prosty endpoint kontrolny. **B:** zanotuj metodę, status i treść odpowiedzi w przeglądarce lub kliencie HTTP.

**Zmiana:** błędny adres endpointu. **Odbiór/omówienie:** odróżnij odpowiedź 404 działającego serwera od braku połączenia. Pierwszy wynik to mały, działający serwer, nie cała aplikacja.

### Blok 2 — Jedna lista, dwóch odbiorców

**Sytuacja:** planista potrzebuje katalogu obiektów. **A:** wystaw P1 i P2 jako JSON. **B:** obsłuż pobranie pojedynczego istniejącego i nieistniejącego obiektu.

**Zmiana:** kolejność listy się odwraca. **Odbiór:** tożsamość obiektu nie zależy od pozycji na liście; nieistniejący identyfikator nie zwraca przypadkowo pierwszego elementu. Na tym etapie dane mogą być w pamięci.

### Blok 3 — Dane przetrwały uruchomienie od nowa

**Sytuacja:** po restarcie znika katalog. **A:** przenieś obiekty i jednostki do SQLite zgodnie z materiałem. **B:** dodaj rekord, uruchom proces ponownie i sprawdź jego obecność.

**Zmiana:** uruchomienie z innego katalogu roboczego wskazuje inny plik bazy. **Odbiór:** student umie wskazać faktycznie używaną ścieżkę; nie myli nowej pustej bazy z utratą danych w starej. Prowadzący wyjaśnia minimalny schemat bez odsyłania do RSOD.

### Blok 4 — Pierwsze kolidujące terminy

**Sytuacja:** w stanie kontrolnym istnieje R1. **A:** utwórz rezerwację P1 10:00–11:00; powinna być przyjęta. **B:** spróbuj P1 09:00–11:00; powinna być odrzucona jako konflikt.

**Zmiana:** inny obiekt w tym samym czasie nie koliduje czasowo, ale P2 nadal jest niedostępny. **Odbiór:** student rozróżnia przyczyny odmowy. Próby sekwencyjne nie są jeszcze dowodem poprawności przy równoczesnym zapisie.

## Laboratorium — spotkanie 2: walidacja i ochrona

Materiał: [Cztery części spotkania 2](../cwiczenia/spotkanie2.qmd).

**Diagnoza wejściowa:** „Czy 10:00–11:00 koliduje z R1?” — nie. „Czy odczyt braku konfliktu gwarantuje możliwość późniejszego zapisu?” — nie.

### Blok 5 — Poprawny JSON, niepoprawne znaczenie

**Sytuacja:** początek rezerwacji jest późniejszy niż koniec. **A:** waliduj przedział. **B:** przygotuj próby dla równego początku/końca oraz daty w przeszłości.

**Zmiana:** klient wysyła inny zapis strefy czasowej. **Odbiór:** spójna interpretacja czasu lub jawne odrzucenie formatu poza kontraktem; błąd nie tworzy rekordu. Testy liczą T względem daty wykonania.

### Blok 6 — Konto bez samodzielnego awansu

**Sytuacja:** użytkownik tworzy konto. **A:** zapisuj hash hasła i obsłuż logowanie. **B:** wyślij dodatkowe pole z rolą planisty.

**Zmiana:** błędne hasło. **Odbiór:** brak tokenu, brak hasła w odpowiedzi i logu; samodzielna deklaracja roli nie daje uprawnień. Konto planisty przygotowuje prowadzący kontrolowaną ścieżką.

### Blok 7 — Cudza rezerwacja

**Sytuacja:** Alfa zna identyfikator rezerwacji Bravo. **A:** sprawdź operację na własnej rezerwacji. **B:** wykonaj tę samą operację na cudzej jako Alfa, a następnie jako planista.

Korzystaj z przypisania `uzytkownicy.jednostka_id` i kontroli jednostki opisanej w części III materiału. Nowe konto bez przypisania nie może zarządzać rezerwacjami; przypisania przygotowuje prowadzący. Przed każdą próbą usuwania odtwórz rekord testowy.

**Zmiana:** żądanie w ogóle nie ma tokenu. **Odbiór:** odpowiedzi zgodne z przyjętą tabelą uprawnień; odmowa nie zmienia danych. W odpowiedzi indywidualnej student pokazuje miejsce kontroli właściciela, nie tylko dekorator logowania.

### Blok 8 — Dwa stanowiska w tej samej chwili

**Sytuacja:** dwaj klienci rezerwują ten sam wolny termin. **A:** zaprojektuj próbę z jednoczesnymi żądaniami na bazie testowej. **B:** sprawdź stan końcowy i sposób obsługi konfliktu.

**Zmiana:** baza jest chwilowo zajęta. **Odbiór:** najwyżej jedna kolidująca rezerwacja; obsłużona odpowiedź lub ograniczone ponowienie, bez ukrytego drugiego zapisu. Dla wariantu SQLite prowadzący przygotowuje atomową sekcję sprawdzenia i zapisu, np. transakcję rozpoczynającą blokadę zapisu przed odczytem. Samo `SELECT` oraz późniejsze `INSERT` nie spełniają kryterium. Jeśli przygotowany kod nie ma tej ochrony, ćwiczenie kończy się udokumentowanym błędem, nie pozornym zaliczeniem.

## Laboratorium — spotkanie 3: przekazanie aplikacji

Materiał: [Cztery części spotkania 3](../cwiczenia/spotkanie3.qmd).

**Diagnoza wejściowa:** „Czy ukryty przycisk zabezpiecza operację?” — nie. „Czy podpisany token pozwala użytkownikowi wybrać dowolną jednostkę?” — nie, serwer nadal sprawdza uprawnienia.

### Blok 9 — Kolega implementuje klienta z dokumentacji

**Sytuacja:** druga para zna tylko kontrakt API. **A:** opisz żądanie, odpowiedź sukcesu i błędy rezerwacji. **B:** napisz próbę sukcesu i próbę konfliktu na osobnej bazie testowej.

**Zmiana:** baza na starcie jest pusta. **Odbiór:** test tworzy własne obiekty i konta oraz odczytuje zwrócone ID; nie zakłada, że rekord numer 1 istnieje. Opisane błędy zgadzają się z rzeczywistymi odpowiedziami.

### Blok 10 — Ekran wyjaśnia, co się stało

**Sytuacja:** operator dostaje samo „Błąd”. **A:** pokaż listę i prosty formularz. **B:** wyświetl czytelny komunikat konfliktu i błędu walidacji.

**Zmiana:** przerwij odpowiedź podczas zapisu w środowisku demonstracyjnym. **Odbiór:** interfejs nie deklaruje sukcesu ani pewnej porażki bez dowodu; pozwala sprawdzić aktualny stan. Pełna idempotencja ponowień jest zadaniem dodatkowym, nie obowiązkiem tego bloku.

### Blok 11 — Uruchomienie na drugim stanowisku

**Sytuacja:** aplikacja ma działać z przygotowanego środowiska Docker. **A:** uruchom według instrukcji z materiału. **B:** sprawdź trwałość danych przy odtworzeniu kontenera z zachowanym wolumenem.

**Zmiana:** inny numer portu hosta. **Odbiór:** student odróżnia adres przeglądarki od adresu usługi wewnątrz środowiska. Nie usuwa wolumenu, aby „naprawić” aplikację. Obrazy i zależności powinny być przygotowane przed zajęciami.

### Blok 12 — Odbiór przez nową zmianę

**Sytuacja:** grupa przekazuje system innej parze. **A:** druga para realizuje rezerwację bez ustnych podpowiedzi. **B:** uruchamia trzy przypadki odmowy: konflikt, cudzy zasób, niepoprawny przedział.

**Zmiana:** prowadzący wybiera jeden wcześniejszy przypadek brzegowy. **Odbiór:** działanie zgodne z kontraktem i krótki protokół: co potwierdzono, co nie działa, jakie są ograniczenia. Nie wymagamy publikacji w publicznym internecie; wystarcza uruchomienie w przygotowanym środowisku zajęciowym.

## Ocena i warunki wykonalności

Formatywna skala bloku: 0–2 pkt zachowanie aplikacji, 0–1 dowód w postaci próby i stanu danych, 0–1 indywidualne wyjaśnienie. Funkcja odrzucająca błędne dane może być bardziej wartościowym wynikiem niż dodatkowy ekran. Skala nie modyfikuje quizów ani formalnych zasad zaliczenia.

Przed każdym spotkaniem potrzebny jest sprawdzony stan startowy z poprzedniego, przygotowane konta testowe i instrukcja odtworzenia danych. Najtrudniejsze fragmenty, zwłaszcza współbieżność i konfiguracja środowiska, prowadzący dostarcza jako analizowany szkielet. Samodzielne pisanie całego systemu od pustego katalogu przekroczyłoby ten budżet czasu.
